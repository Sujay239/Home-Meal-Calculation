<?php
/**
 * JWT Authentication Helper / Middleware
 * Verifies incoming requests to protected endpoints.
 */

require_once __DIR__ . '/cors.php';

/**
 * Base64 URL decode helper
 */
function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

/**
 * Base64 URL encode helper for validation
 */
function base64UrlEncodeHelper($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

/**
 * Validate the incoming JWT token from the Authorization header or request parameter.
 * Returns the decoded payload if valid, otherwise returns false.
 */
function validateJWT() {
    $secretKey = "room_manager_secure_jwt_secret_key_2026_prod";
    $token = null;

    // 1. Look for token in Authorization header
    $headers = null;
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }

    $authHeader = null;
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (!empty($authHeader)) {
        if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }

    // 2. Fallback: Check $_GET or $_POST parameters
    if (empty($token)) {
        if (isset($_GET['token'])) {
            $token = trim($_GET['token']);
        } elseif (isset($_POST['token'])) {
            $token = trim($_POST['token']);
        } else {
            // Check in JSON body if any
            $data = json_decode(file_get_contents("php://input"), true);
            if (isset($data['token'])) {
                $token = trim($data['token']);
            }
        }
    }

    if (empty($token)) {
        return false;
    }

    // 3. Decode and verify JWT
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

    // Recalculate signature using HMAC-SHA256
    $expectedSignature = base64UrlEncodeHelper(
        hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secretKey, true)
    );

    // Verify signature securely against timing attacks
    if (!hash_equals($expectedSignature, $base64UrlSignature)) {
        return false;
    }

    // Decode and verify expiration
    $payload = json_decode(base64UrlDecode($base64UrlPayload), true);
    if (!$payload) {
        return false;
    }

    if (isset($payload['exp']) && time() > $payload['exp']) {
        return false; // Token is expired
    }

    return $payload; // Return validated claims/user details
}

/**
 * Require authentication.
 * Stops execution and returns HTTP 401 if validation fails.
 */
function requireAuth() {
    // Standard handling for OPTIONS preflight requests in CORS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit();
    }

    $payload = validateJWT();
    if (!$payload) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Access Denied. A valid, unexpired authentication token is required to access this resource."
        ]);
        exit();
    }
    return $payload;
}
?>
