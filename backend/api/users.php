<?php
/**
 * Roommates/Users API Endpoint
 * GET  /backend/api/users.php (Fetch all users securely)
 * POST /backend/api/users.php (Handles change_avatar and change_password)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/../config/database.php';

// Protect route - enforce valid JWT authentication
$currentUser = requireAuth();

$currentUserId = 0;
if (is_array($currentUser) && isset($currentUser['id'])) {
    $currentUserId = (int)$currentUser['id'];
} elseif (is_object($currentUser) && isset($currentUser->id)) {
    $currentUserId = (int)$currentUser->id;
}

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

    } elseif ($method === 'POST') {
        // Retrieve payload
        $data = json_decode(file_get_contents("php://input"), true);
        $action = isset($data['action']) ? trim($data['action']) : '';

        if ($action === 'change_avatar') {
            $avatar = isset($data['avatar']) ? $data['avatar'] : '';
            
           

            // Update user avatar in DB
            $query = "UPDATE users SET avatar = :avatar WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':avatar', $avatar);
            $stmt->bindParam(':id', $currentUserId, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "Avatar updated successfully.",
                    "avatar" => $avatar
                ]);
                exit();
            } else {
                throw new Exception("Failed to update avatar in database.");
            }

        } elseif ($action === 'change_password') {
            $currentPassword = isset($data['current_password']) ? $data['current_password'] : '';
            $newPassword = isset($data['new_password']) ? $data['new_password'] : '';

            if (empty($currentPassword) || empty($newPassword)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Both current password and new password are required."
                ]);
                exit();
            }

            // Fetch stored password hash for current user
            $query = "SELECT password FROM users WHERE id = :id LIMIT 1";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $currentUserId, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "User not found."
                ]);
                exit();
            }

            $user = $stmt->fetch();
            
            // Verify current password
            if (!password_verify($currentPassword, $user['password'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Incorrect current password."
                ]);
                exit();
            }

            // Hash new password using BCRYPT
            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

            // Update password in DB
            $updateQuery = "UPDATE users SET password = :password WHERE id = :id";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(':password', $newHash);
            $updateStmt->bindParam(':id', $currentUserId, PDO::PARAM_INT);

            if ($updateStmt->execute()) {
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "Password updated successfully."
                ]);
                exit();
            } else {
                throw new Exception("Failed to update password in database.");
            }

        } else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid or missing action. Allowed actions: 'change_avatar', 'change_password'."
            ]);
            exit();
        }

    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed. Only GET and POST requests are supported."
        ]);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
