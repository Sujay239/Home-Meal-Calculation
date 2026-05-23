<?php
/**
 * Meals Log API Endpoint
 * GET  /backend/api/meals.php (Fetch all logged meals)
 * POST /backend/api/meals.php (Log a new meal)
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
        // Accept month and year parameters (defaulting to the current month & year)
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

        // Calculate date ranges to allow index usage (avoiding MONTH() / YEAR() full table scans)
        $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
        $end_date = date("Y-m-t 23:59:59", strtotime($start_date));

        // Fetch meals for the selected month and year ordered by date (newest first, excluding admin) with user avatar
        $query = "SELECT m.id, m.user_id, m.username, m.meal_time, u.avatar FROM meals m
                  LEFT JOIN users u ON m.user_id = u.id OR m.username = u.username
                  WHERE m.meal_time BETWEEN :start_date AND :end_date 
                    AND LOWER(TRIM(m.username)) != 'admin'
                  ORDER BY m.meal_time DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':start_date', $start_date);
        $stmt->bindParam(':end_date', $end_date);
        $stmt->execute();
        
        $meals = [];
        while ($row = $stmt->fetch()) {
            $meals[] = [
                "id" => (int)$row['id'],
                "user_id" => (int)$row['user_id'],
                "username" => $row['username'],
                "meal_time" => $row['meal_time'],
                "avatar" => $row['avatar']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "meals" => $meals
        ]);
        exit();

    } elseif ($method === 'POST') {
        // Retrieve POST payload (supports JSON and form POST)
        $data = json_decode(file_get_contents("php://input"), true);
        
        $username = isset($data['username']) ? trim($data['username']) : (isset($_POST['username']) ? trim($_POST['username']) : '');

        if (empty($username)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Missing required field. 'username' is required to log a meal."
            ]);
            exit();
        }

        // 1. Resolve user_id dynamically from username
        $userQuery = "SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1";
        $userStmt = $db->prepare($userQuery);
        $userStmt->bindParam(":username", $username);
        $userStmt->execute();
        
        $userId = 0;
        if ($userStmt->rowCount() > 0) {
            $userRow = $userStmt->fetch();
            $userId = (int)$userRow['id'];
        }

        // 2. Insert new meal record
        $insertQuery = "INSERT INTO meals (user_id, username, meal_time) VALUES (:user_id, :username, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindParam(":user_id", $userId);
        $insertStmt->bindParam(":username", $username);
        
        if ($insertStmt->execute()) {
            $newId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Meal logged successfully.",
                "meal" => [
                    "id" => (int)$newId,
                    "user_id" => $userId,
                    "username" => $username,
                    "meal_time" => date('Y-m-d H:i:s')
                ]
            ]);
            exit();
        } else {
            throw new Exception("Unable to save meal log record.");
        }
    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed. Only GET and POST requests are supported."
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
