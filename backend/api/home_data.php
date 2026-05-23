<?php
/**
 * Home Page Dashboard Data API Endpoint
 * GET /backend/api/home_data.php
 * Accepts optional query parameters: month, year
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/../config/database.php';

// Protect route - enforce valid JWT authentication
$currentUserClaims = requireAuth();

$currentUsername = '';
$currentUserId = 0;
$currentUserRole = '';

if (is_array($currentUserClaims)) {
    $currentUsername = isset($currentUserClaims['username']) ? $currentUserClaims['username'] : '';
    $currentUserId = isset($currentUserClaims['id']) ? $currentUserClaims['id'] : 0;
    $currentUserRole = isset($currentUserClaims['role']) ? $currentUserClaims['role'] : '';
} elseif (is_object($currentUserClaims)) {
    $currentUsername = isset($currentUserClaims->username) ? $currentUserClaims->username : '';
    $currentUserId = isset($currentUserClaims->id) ? $currentUserClaims->id : 0;
    $currentUserRole = isset($currentUserClaims->role) ? $currentUserClaims->role : '';
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed. Only GET requests are supported."
        ]);
        exit();
    }

    // Accept month and year parameters (defaulting to the current month & year)
    $month = isset($_GET['month']) && is_numeric($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
    $year = isset($_GET['year']) && is_numeric($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // Enforce strict bounds validation to prevent SQL Date range failures
    if ($month < 1 || $month > 12) {
        $month = (int)date('m');
    }
    if ($year < 2000 || $year > 2100) {
        $year = (int)date('Y');
    }

    // Calculate date ranges to allow index usage (avoiding MONTH() / YEAR() full table scans)
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date("Y-m-t 23:59:59", strtotime($start_date));

    // 1. Fetch total spent globally in the selected month & year (excluding admin)
    $spentQuery = "SELECT COALESCE(SUM(price), 0) as total_spent FROM purchases 
                   WHERE purchase_date BETWEEN :start_date AND :end_date
                     AND LOWER(TRIM(username)) != 'admin'";
    $spentStmt = $db->prepare($spentQuery);
    $spentStmt->bindParam(':start_date', $start_date);
    $spentStmt->bindParam(':end_date', $end_date);
    $spentStmt->execute();
    $spentRow = $spentStmt->fetch();
    $globalTotalSpent = (float)$spentRow['total_spent'];

    // 2. Fetch total meals globally in the selected month & year (excluding admin)
    $mealsQuery = "SELECT COUNT(*) as total_meals FROM meals 
                   WHERE meal_time BETWEEN :start_date AND :end_date
                     AND LOWER(TRIM(username)) != 'admin'";
    $mealsStmt = $db->prepare($mealsQuery);
    $mealsStmt->bindParam(':start_date', $start_date);
    $mealsStmt->bindParam(':end_date', $end_date);
    $mealsStmt->execute();
    $mealsRow = $mealsStmt->fetch();
    $globalTotalMeals = (int)$mealsRow['total_meals'];

    // Calculate cost per meal
    $perMealCost = $globalTotalMeals > 0 ? $globalTotalSpent / $globalTotalMeals : 0.0;

    // 3. Fetch roommate-wise aggregation dynamically (excluding admin)
    // Avoid running 2 * N nested subqueries by selecting total expenses and meals grouped by user first
    // This reduces database operations from 17 full scans to just 3 index-friendly queries!
    
    // Get expenses per user
    $expQuery = "SELECT username, SUM(price) as total_price 
                 FROM purchases 
                 WHERE purchase_date BETWEEN :start_p AND :end_p 
                 AND LOWER(TRIM(username)) != 'admin'
                 GROUP BY username";
    $expStmt = $db->prepare($expQuery);
    $expStmt->bindParam(':start_p', $start_date);
    $expStmt->bindParam(':end_p', $end_date);
    $expStmt->execute();
    $expensesMap = [];
    while ($row = $expStmt->fetch()) {
        $key = strtolower(trim($row['username']));
        $expensesMap[$key] = (float)$row['total_price'];
    }

    // Get meals per user
    $mealsCountQuery = "SELECT username, COUNT(*) as total_meals 
                        FROM meals 
                        WHERE meal_time BETWEEN :start_m AND :end_m 
                          AND LOWER(TRIM(username)) != 'admin'
                        GROUP BY username";
    $mealsCountStmt = $db->prepare($mealsCountQuery);
    $mealsCountStmt->bindParam(':start_m', $start_date);
    $mealsCountStmt->bindParam(':end_m', $end_date);
    $mealsCountStmt->execute();
    $mealsMap = [];
    while ($row = $mealsCountStmt->fetch()) {
        $key = strtolower(trim($row['username']));
        $mealsMap[$key] = (int)$row['total_meals'];
    }

    // Fetch active users list
    $usersQuery = "SELECT id, username, role, avatar FROM users 
                   WHERE LOWER(TRIM(username)) != 'admin' 
                   ORDER BY username ASC";
    $usersStmt = $db->prepare($usersQuery);
    $usersStmt->execute();

    $usersData = [];
    $currentUserDashboardData = null;

    while ($row = $usersStmt->fetch()) {
        $uName = $row['username'];
        $key = strtolower(trim($uName));
        $userExpenses = isset($expensesMap[$key]) ? $expensesMap[$key] : 0.0;
        $userMeals = isset($mealsMap[$key]) ? $mealsMap[$key] : 0;

        $userItem = [
            "id" => (int)$row['id'],
            "username" => $uName,
            "role" => $row['role'],
            "avatar" => $row['avatar'],
            "expenses" => $userExpenses,
            "meals" => $userMeals
        ];
        
        $usersData[] = $userItem;

        // Check if this matches the logged-in user
        if (strtolower(trim($uName)) === strtolower(trim($currentUsername))) {
            $currentUserDashboardData = $userItem;
        }
    }

    // If the logged in user wasn't found in the users list (e.g. database seed discrepancy), 
    // create a default record so the app doesn't crash
    if ($currentUserDashboardData === null) {
        $currentUserDashboardData = [
            "id" => (int)$currentUserId,
            "username" => $currentUsername,
            "role" => $currentUserRole,
            "avatar" => null,
            "expenses" => 0.0,
            "meals" => 0
        ];
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "month" => $month,
        "year" => $year,
        "global_total_spent" => $globalTotalSpent,
        "global_total_meals" => $globalTotalMeals,
        "per_meal_cost" => $perMealCost,
        "users" => $usersData,
        "currentUser" => $currentUserDashboardData
    ]);
    exit();

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
