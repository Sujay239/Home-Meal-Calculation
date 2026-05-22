<?php
/**
 * Roommates/Users API Endpoint
 * GET /backend/api/users.php (Fetch all users securely)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/../config/database.php';

// Protect route - enforce valid JWT authentication
$currentUser = requireAuth();

try {
    $database = new Database();
    $db = $database->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Fetch all users securely (excluding password hashes and excluding admin)
        $query = "SELECT id, username, role, avatar FROM users WHERE LOWER(TRIM(username)) != 'admin' ORDER BY username ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $users = [];
        while ($row = $stmt->fetch()) {
            $users[] = [
                "id" => (int)$row['id'],
                "username" => $row['username'],
                "role" => $row['role'],
                "avatar" => $row['avatar']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "users" => $users
        ]);
        exit();
    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed. Only GET requests are supported."
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
