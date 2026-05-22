<?php
/**
 * User Authentication API Endpoint
 * POST /backend/api/login.php
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/../config/database.php';

// Retrieve request body (support JSON and URL-encoded forms)
$data = json_decode(file_get_contents("php://input"), true);

$username = isset($data['username']) ? trim($data['username']) : (isset($_POST['username']) ? trim($_POST['username']) : '');
$password = isset($data['password']) ? $data['password'] : (isset($_POST['password']) ? $_POST['password'] : '');

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Username and password are required fields."
    ]);
    exit();
}

/**
 * Base64 URL encode helper for JWT
 */
function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

/**
 * Generate signed JWT using HMAC SHA256
 */
function generateJWT($user, $secretKey) {
    $header = json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT'
    ]);
    
    $payload = json_encode([
        'id' => (int)$user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
        'exp' => time() + (7 * 24 * 60 * 60) // 1 week expiration
    ]);
    
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secretKey, true);
    $base64UrlSignature = base64UrlEncode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Query user by username (case-insensitive)
    $query = "SELECT id, username, password, role, avatar FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $username);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $user = $stmt->fetch();
        
        // Securely verify hashed password
        if (password_verify($password, $user['password'])) {
            // JWT Secret Key (In production, load this from environment variables or a secure configuration file)
            $secretKey = "room_manager_secure_jwt_secret_key_2026_prod";
            $token = generateJWT($user, $secretKey);

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Login successful.",
                "token" => $token,
                "user" => [
                    "id" => (int)$user['id'],
                    "username" => $user['username'],
                    "role" => $user['role'],
                    "avatar" => $user['avatar']
                ]
            ]);
            exit();
        }
    }

    // Default error response for invalid credentials
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Invalid username or password."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error encountered during authentication: " . $e->getMessage()
    ]);
}
?>
