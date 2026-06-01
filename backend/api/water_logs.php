<?php
/**
 * Water Logs API Endpoint
 * GET  /backend/api/water_logs.php (Fetch recent water logs)
 * POST /backend/api/water_logs.php (Log a new water purchase)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/../config/database.php';

// Protect route - enforce valid JWT authentication
$currentUser = requireAuth();

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Self-healing migration: Ensure water_logs table exists
    $db->exec("CREATE TABLE IF NOT EXISTS `water_logs` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `username` varchar(50) NOT NULL,
      `log_time` datetime NOT NULL,
      PRIMARY KEY (`id`),
      KEY `user_id` (`user_id`),
      KEY `log_time` (`log_time`),
      KEY `username` (`username`)
    ) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $month = isset($_GET['month']) ? (int)$_GET['month'] : 0;
        $year = isset($_GET['year']) ? (int)$_GET['year'] : 0;

        if ($month > 0 && $year > 0) {
            // Fetch logs for the specified month and year
            $query = "SELECT id, user_id, username, log_time 
                      FROM water_logs 
                      WHERE YEAR(log_time) = :year AND MONTH(log_time) = :month 
                      ORDER BY log_time DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":year", $year, PDO::PARAM_INT);
            $stmt->bindParam(":month", $month, PDO::PARAM_INT);
        } else {
            // Fallback to last 10 logs ordered by log_time DESC
            $query = "SELECT id, user_id, username, log_time FROM water_logs ORDER BY log_time DESC LIMIT 10";
            $stmt = $db->prepare($query);
        }
        
        $stmt->execute();
        
        $logs = [];
        while ($row = $stmt->fetch()) {
            $logs[] = [
                "id" => (int)$row['id'],
                "user_id" => (int)$row['user_id'],
                "username" => $row['username'],
                "log_time" => $row['log_time']
            ];
        }

        // Fetch absolute latest log to compute lockout status on client-side
        $latestQuery = "SELECT username, log_time FROM water_logs ORDER BY log_time DESC LIMIT 1";
        $latestStmt = $db->prepare($latestQuery);
        $latestStmt->execute();
        $lastLog = null;
        if ($row = $latestStmt->fetch()) {
            $lastLog = [
                "username" => $row['username'],
                "log_time" => $row['log_time']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "logs" => $logs,
            "last_log" => $lastLog
        ]);
        exit();

    } elseif ($method === 'POST') {
        // Retrieve the latest logged water purchase to check the 48-hour limit
        $checkQuery = "SELECT username, log_time FROM water_logs ORDER BY log_time DESC LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute();
        
        if ($row = $checkStmt->fetch()) {
            $lastLogTime = strtotime($row['log_time']);
            $currentTime = time();
            $diffSeconds = $currentTime - $lastLogTime;
            $fortyEightHours = 48 * 3600; // 2 days in seconds
            
            if ($diffSeconds < $fortyEightHours) {
                $remainingSeconds = $fortyEightHours - $diffSeconds;
                
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "A water purchase was already logged by " . $row['username'] . " at " . date('Y-m-d h:i A', $lastLogTime) . ".",
                    "remaining_seconds" => $remainingSeconds,
                    "last_log" => [
                        "username" => $row['username'],
                        "log_time" => $row['log_time']
                    ]
                ]);
                exit();
            }
        }

        // Get user details
        $username = $currentUser['username'];
        
        // Resolve user_id from username if possible
        $userQuery = "SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1";
        $userStmt = $db->prepare($userQuery);
        $userStmt->bindParam(":username", $username);
        $userStmt->execute();
        
        $userId = 0;
        if ($userStmt->rowCount() > 0) {
            $userRow = $userStmt->fetch();
            $userId = (int)$userRow['id'];
        }

        // Insert new water log record
        $insertQuery = "INSERT INTO water_logs (user_id, username, log_time) VALUES (:user_id, :username, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindParam(":user_id", $userId);
        $insertStmt->bindParam(":username", $username);
        
        if ($insertStmt->execute()) {
            $newId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Water purchase logged successfully.",
                "log" => [
                    "id" => (int)$newId,
                    "user_id" => $userId,
                    "username" => $username,
                    "log_time" => date('Y-m-d H:i:s')
                ]
            ]);
            exit();
        } else {
            throw new Exception("Unable to save water log record.");
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
