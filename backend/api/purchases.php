<?php
/**
 * Purchases API Endpoint
 * GET  /backend/api/purchases.php (Fetch all purchases)
 * POST /backend/api/purchases.php (Log a new purchase)
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

        // Fetch purchases for the selected month and year ordered by date (newest first, excluding admin) with user avatar
        $query = "SELECT p.id, p.user_id, p.username, p.product, p.price, p.purchase_date, u.avatar FROM purchases p 
                  LEFT JOIN users u ON p.user_id = u.id OR LOWER(TRIM(p.username)) = LOWER(TRIM(u.username))
                  WHERE MONTH(p.purchase_date) = :month AND YEAR(p.purchase_date) = :year 
                    AND LOWER(TRIM(p.username)) != 'admin'
                  ORDER BY p.purchase_date DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':month', $month, PDO::PARAM_INT);
        $stmt->bindParam(':year', $year, PDO::PARAM_INT);
        $stmt->execute();
        
        $purchases = [];
        while ($row = $stmt->fetch()) {
            $purchases[] = [
                "id" => (int)$row['id'],
                "user_id" => (int)$row['user_id'],
                "username" => $row['username'],
                "product" => $row['product'],
                "price" => (float)$row['price'],
                "purchase_date" => $row['purchase_date'],
                "avatar" => $row['avatar']
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "purchases" => $purchases
        ]);
        exit();

    } elseif ($method === 'POST') {
        // Retrieve POST payload (supports JSON and form POST)
        $data = json_decode(file_get_contents("php://input"), true);
        
        $username = isset($data['username']) ? trim($data['username']) : (isset($_POST['username']) ? trim($_POST['username']) : '');
        $product = isset($data['product']) ? trim($data['product']) : (isset($_POST['product']) ? trim($_POST['product']) : '');
        $price = isset($data['price']) ? (float)$data['price'] : (isset($_POST['price']) ? (float)$_POST['price'] : 0.0);

        if (empty($username) || empty($product) || $price <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Missing or invalid fields. 'username', 'product', and a positive 'price' are required."
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

        // 2. Insert new purchase record
        $insertQuery = "INSERT INTO purchases (user_id, username, product, price, purchase_date) 
                        VALUES (:user_id, :username, :product, :price, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindParam(":user_id", $userId);
        $insertStmt->bindParam(":username", $username);
        $insertStmt->bindParam(":product", $product);
        $insertStmt->bindParam(":price", $price);
        
        if ($insertStmt->execute()) {
            $newId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Purchase logged successfully.",
                "purchase" => [
                    "id" => (int)$newId,
                    "user_id" => $userId,
                    "username" => $username,
                    "product" => $product,
                    "price" => $price,
                    "purchase_date" => date('Y-m-d H:i:s')
                ]
            ]);
            exit();
        } else {
            throw new Exception("Unable to save purchase log record.");
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
