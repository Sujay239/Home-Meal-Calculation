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
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // 1. Fetch total spent globally in the selected month & year (excluding admin)
    $spentQuery = "SELECT COALESCE(SUM(price), 0) as total_spent FROM purchases 
                   WHERE MONTH(purchase_date) = :month AND YEAR(purchase_date) = :year
                     AND LOWER(TRIM(username)) != 'admin'";
    $spentStmt = $db->prepare($spentQuery);
    $spentStmt->bindParam(':month', $month, PDO::PARAM_INT);
    $spentStmt->bindParam(':year', $year, PDO::PARAM_INT);
    $spentStmt->execute();
    $spentRow = $spentStmt->fetch();
    $globalTotalSpent = (float)$spentRow['total_spent'];

    // 2. Fetch total meals globally in the selected month & year (excluding admin)
    $mealsQuery = "SELECT COUNT(*) as total_meals FROM meals 
                   WHERE MONTH(meal_time) = :month AND YEAR(meal_time) = :year
                     AND LOWER(TRIM(username)) != 'admin'";
    $mealsStmt = $db->prepare($mealsQuery);
    $mealsStmt->bindParam(':month', $month, PDO::PARAM_INT);
    $mealsStmt->bindParam(':year', $year, PDO::PARAM_INT);
    $mealsStmt->execute();
    $mealsRow = $mealsStmt->fetch();
    $globalTotalMeals = (int)$mealsRow['total_meals'];

    // Calculate cost per meal
    $perMealCost = $globalTotalMeals > 0 ? $globalTotalSpent / $globalTotalMeals : 0.0;

    // 3. Fetch roommate-wise aggregation dynamically (excluding admin)
    // We select all users, and for each, aggregate their purchases and meals in the selected month & year
    // We use LOWER(TRIM(p.username)) = LOWER(TRIM(u.username)) to handle database seeding variations safely
    $usersQuery = "SELECT u.id, u.username, u.role, u.avatar,
                  (
                      SELECT COALESCE(SUM(p.price), 0) 
                      FROM purchases p 
                      WHERE LOWER(TRIM(p.username)) = LOWER(TRIM(u.username)) 
                        AND MONTH(p.purchase_date) = :month_p 
                        AND YEAR(p.purchase_date) = :year_p
                  ) as expenses,
                  (
                      SELECT COUNT(*) 
                      FROM meals m 
                      WHERE LOWER(TRIM(m.username)) = LOWER(TRIM(u.username)) 
                        AND MONTH(m.meal_time) = :month_m 
                        AND YEAR(m.meal_time) = :year_m
                  ) as meals
                  FROM users u
                  WHERE LOWER(TRIM(u.username)) != 'admin'
                  ORDER BY u.username ASC";
                  
    $usersStmt = $db->prepare($usersQuery);
    $usersStmt->bindParam(':month_p', $month, PDO::PARAM_INT);
    $usersStmt->bindParam(':year_p', $year, PDO::PARAM_INT);
    $usersStmt->bindParam(':month_m', $month, PDO::PARAM_INT);
    $usersStmt->bindParam(':year_m', $year, PDO::PARAM_INT);
    $usersStmt->execute();

    $usersData = [];
    $currentUserDashboardData = null;

    while ($row = $usersStmt->fetch()) {
        $userItem = [
            "id" => (int)$row['id'],
            "username" => $row['username'],
            "role" => $row['role'],
            "avatar" => $row['avatar'],
            "expenses" => (float)$row['expenses'],
            "meals" => (int)$row['meals']
        ];
        
        $usersData[] = $userItem;

        // Check if this matches the logged-in user
        if (strtolower(trim($row['username'])) === strtolower(trim($currentUserClaims['username']))) {
            $currentUserDashboardData = $userItem;
        }
    }

    // If the logged in user wasn't found in the users list (e.g. database seed discrepancy), 
    // create a default record so the app doesn't crash
    if ($currentUserDashboardData === null) {
        $currentUserDashboardData = [
            "id" => (int)$currentUserClaims['id'],
            "username" => $currentUserClaims['username'],
            "role" => $currentUserClaims['role'],
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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
