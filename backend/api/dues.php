<?php
/**
 * Dues/Settlements API Endpoint
 * GET    /backend/api/dues.php (Fetch lender settlements involving current user)
 * POST   /backend/api/dues.php (Log a new user-to-user settlement)
 * DELETE /backend/api/dues.php (Delete a user-to-user settlement)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/../config/database.php';

// Protect route - enforce valid JWT authentication
$currentUser = requireAuth();

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Self-healing migration for dues table: ensure subject column exists
    $db->exec("CREATE TABLE IF NOT EXISTS `dues` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `username` varchar(50) NOT NULL,
      `lender_name` varchar(100) NOT NULL,
      `amount` decimal(10,2) DEFAULT 0.00,
      `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`id`)
    ) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;");

    // Add subject column dynamically if it doesn't exist
    $checkColumn = $db->query("SHOW COLUMNS FROM `dues` LIKE 'subject'");
    if ($checkColumn->rowCount() === 0) {
        $db->exec("ALTER TABLE `dues` ADD COLUMN `subject` varchar(255) DEFAULT NULL AFTER `lender_name`");
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $current_username = trim($currentUser['username']);

    if ($method === 'GET') {
        // Accept month and year parameters (optional)
        $month = isset($_GET['month']) && is_numeric($_GET['month']) ? (int)$_GET['month'] : 0;
        $year = isset($_GET['year']) && is_numeric($_GET['year']) ? (int)$_GET['year'] : 0;

        // Fetch settlements involving the current user, excluding admin entries
        $query = "SELECT id, username, lender_name, amount, subject, updated_at FROM dues 
                  WHERE (LOWER(TRIM(username)) = LOWER(:current_user1) OR LOWER(TRIM(lender_name)) = LOWER(:current_user2))
                    AND LOWER(TRIM(username)) != 'admin' 
                    AND LOWER(TRIM(lender_name)) != 'admin'";

        if ($month > 0 && $year > 0) {
            $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
            $end_date = date("Y-m-t 23:59:59", strtotime($start_date));
            $query .= " AND updated_at BETWEEN :start_date AND :end_date";
        }

        $query .= " ORDER BY updated_at DESC";
        $stmt = $db->prepare($query);
        $stmt->bindValue(':current_user1', $current_username);
        $stmt->bindValue(':current_user2', $current_username);
        
        if ($month > 0 && $year > 0) {
            $stmt->bindParam(':start_date', $start_date);
            $stmt->bindParam(':end_date', $end_date);
        }
        
        $stmt->execute();
        
        $dues = [];
        while ($row = $stmt->fetch()) {
            $dues[] = [
                "id" => (int)$row['id'],
                "username" => trim($row['username']),
                "lender_name" => trim($row['lender_name']),
                "amount" => (float)$row['amount'],
                "subject" => $row['subject'] !== null ? trim($row['subject']) : 'Settlement',
                "updated_at" => $row['updated_at']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "dues" => $dues
        ]);
        exit();

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $subject = isset($input['subject']) ? trim($input['subject']) : '';
        $amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
        $type = isset($input['type']) ? trim($input['type']) : ''; // 'give' or 'receive'
        $other_user = isset($input['other_user']) ? trim($input['other_user']) : '';
        
        if (empty($subject)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Subject/Reason is required."]);
            exit();
        }
        
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Amount must be a positive number."]);
            exit();
        }
        
        if (empty($other_user)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Target user name is required."]);
            exit();
        }
        
        if ($type !== 'give' && $type !== 'receive') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid type. Must be 'give' or 'receive'."]);
            exit();
        }

        // Map roles to database: username = debtor, lender_name = lender
        if ($type === 'receive') {
            // Logged-in user is receiving money (so they are the lender)
            $username = $other_user;
            $lender_name = $current_username;
        } else {
            // Logged-in user is giving money (so they are the debtor)
            $username = $current_username;
            $lender_name = $other_user;
        }

        $insertQuery = "INSERT INTO dues (username, lender_name, amount, subject, updated_at) 
                        VALUES (:username, :lender_name, :amount, :subject, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindParam(':username', $username);
        $insertStmt->bindParam(':lender_name', $lender_name);
        $insertStmt->bindParam(':amount', $amount);
        $insertStmt->bindParam(':subject', $subject);
        
        if ($insertStmt->execute()) {
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Settlement logged successfully."
            ]);
            exit();
        } else {
            throw new Exception("Unable to save settlement.");
        }

    } elseif ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid ID."]);
            exit();
        }
        
        // Fetch settlement to check authorization
        $checkQuery = "SELECT username, lender_name FROM dues WHERE id = :id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($row = $checkStmt->fetch()) {
            $dbUsername = trim($row['username']);
            $dbLenderName = trim($row['lender_name']);
            
            // Only the two involved users can delete this settlement
            if (strtolower($dbUsername) === strtolower($current_username) || strtolower($dbLenderName) === strtolower($current_username)) {
                $deleteQuery = "DELETE FROM dues WHERE id = :id";
                $deleteStmt = $db->prepare($deleteQuery);
                $deleteStmt->bindParam(':id', $id, PDO::PARAM_INT);
                $deleteStmt->execute();
                
                http_response_code(200);
                echo json_encode(["success" => true, "message" => "Settlement deleted successfully."]);
                exit();
            } else {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "You are not authorized to delete this settlement."]);
                exit();
            }
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Settlement not found."]);
            exit();
        }
    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed."
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
