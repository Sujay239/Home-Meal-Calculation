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
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

        // Fetch settlements for the selected month and year ordered by date (newest first, excluding admin)
        $query = "SELECT id, username, lender_name, amount, updated_at FROM dues 
                  WHERE MONTH(updated_at) = :month AND YEAR(updated_at) = :year 
                    AND LOWER(TRIM(username)) != 'admin' AND LOWER(TRIM(lender_name)) != 'admin'
                  ORDER BY updated_at DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':month', $month, PDO::PARAM_INT);
        $stmt->bindParam(':year', $year, PDO::PARAM_INT);
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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
