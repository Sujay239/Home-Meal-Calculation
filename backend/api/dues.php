<?php
/**
 * Dues/Settlements API Endpoint
 * GET /backend/api/dues.php (Fetch all lender settlements)
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

        // Fetch settlements for the selected month and year ordered by date (newest first, excluding admin)
        $query = "SELECT id, username, lender_name, amount, updated_at FROM dues 
                  WHERE updated_at BETWEEN :start_date AND :end_date 
                    AND LOWER(TRIM(username)) != 'admin' AND LOWER(TRIM(lender_name)) != 'admin'
                  ORDER BY updated_at DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':start_date', $start_date);
        $stmt->bindParam(':end_date', $end_date);
        $stmt->execute();
        
        $dues = [];
        while ($row = $stmt->fetch()) {
            $dues[] = [
                "id" => (int)$row['id'],
                "username" => $row['username'],
                "lender_name" => $row['lender_name'],
                "amount" => (float)$row['amount'],
                "updated_at" => $row['updated_at']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "dues" => $dues
        ]);
        exit();
    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "HTTP Method not allowed. Only GET requests are supported."
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
