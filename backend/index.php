<?php
/**
 * Room Manager Backend - Front Controller & Router
 * Routes API calls to individual scripts and displays system diagnostic status.
 */

// --------------------------------------------------------------
// Global CORS (Cross-Origin Resource Sharing) Handlers
// --------------------------------------------------------------
require_once __DIR__ . '/api/cors.php';
require_once __DIR__ . '/config/database.php';

// --------------------------------------------------------------
// Parse Request Route
// --------------------------------------------------------------
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g. "/backend/index.php" or "/index.php"
$scriptDir = dirname($scriptName);     // e.g. "/backend" or "/"

if (strpos($requestUri, $scriptName) === 0) {
    $route = substr($requestUri, strlen($scriptName));
} else if ($scriptDir !== '/' && $scriptDir !== '\\' && strpos($requestUri, $scriptDir) === 0) {
    $route = substr($requestUri, strlen($scriptDir));
} else {
    $route = $requestUri;
}
$route = trim($route, '/');

// --------------------------------------------------------------
// Parse Incoming JSON Body
// --------------------------------------------------------------
$inputData = [];
$rawBody = file_get_contents('php://input');
if (!empty($rawBody)) {
    $inputData = json_decode($rawBody, true) ?: [];
}

// Make the parsed JSON globally accessible via helper variable
$GLOBALS['JSON_BODY'] = $inputData;

// Helper to retrieve JSON post data safely
function getJsonInput() {
    return $GLOBALS['JSON_BODY'] ?? [];
}

// --------------------------------------------------------------
// Test database connection dynamically (for diagnostics)
// --------------------------------------------------------------
$db_status = "Disconnected";
$db_error = null;
try {
    $database = new Database();
    $db = $database->getConnection();
    if ($db) {
        $db_status = "Connected successfully";
    }
} catch (Exception $e) {
    $db_status = "Failed";
    $db_error = $e->getMessage();
}

$base_path = rtrim($scriptName, '/\\');

$server_info = [
    "status" => "Running",
    "php_version" => PHP_VERSION,
    "database" => [
        "status" => $db_status,
        "error" => $db_error
    ],
    "endpoints" => [
        [
            "path" => $base_path . "/api/login.php",
            "method" => "POST",
            "description" => "User Authentication (returns JWT token)"
        ],
        [
            "path" => $base_path . "/api/register.php",
            "method" => "POST",
            "description" => "User registration"
        ],
        [
            "path" => $base_path . "/api/meals.php",
            "method" => "GET / POST",
            "description" => "Fetch or log meal records"
        ],
        [
            "path" => $base_path . "/api/purchases.php",
            "method" => "GET / POST",
            "description" => "Fetch or log room purchases"
        ],
        [
            "path" => $base_path . "/api/dues.php",
            "method" => "GET",
            "description" => "Calculate roommate meal calculations and dues"
        ],
        [
            "path" => $base_path . "/api/users.php",
            "method" => "POST",
            "description" => "Update avatar image or change password"
        ]
    ]
];

// --------------------------------------------------------------
// Endpoint Routing & Matching
// --------------------------------------------------------------
switch ($route) {
    case 'api/login':
    case 'api/login.php':
        require_once __DIR__ . '/api/login.php';
        exit();

    case 'api/register':
    case 'api/register.php':
        require_once __DIR__ . '/api/register.php';
        exit();

    case 'api/meals':
    case 'api/meals.php':
        require_once __DIR__ . '/api/meals.php';
        exit();

    case 'api/purchases':
    case 'api/purchases.php':
        require_once __DIR__ . '/api/purchases.php';
        exit();

    case 'api/dues':
    case 'api/dues.php':
        require_once __DIR__ . '/api/dues.php';
        exit();

    case 'api/home_data':
    case 'api/home_data.php':
        require_once __DIR__ . '/api/home_data.php';
        exit();

    case 'api/users':
    case 'api/users.php':
        require_once __DIR__ . '/api/users.php';
        exit();

    case 'api/test':
    case 'api/test.php':
        echo json_encode([
            'success' => true,
            'status' => 'running',
            'message' => 'Home Meal Calculation Backend is active!',
            'database' => $db_status,
            'time' => date('Y-m-d H:i:s')
        ]);
        exit();

    case '':
    case 'api':
        // Return diagnostics JSON if requested
        if (isset($_GET['json']) || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
            echo json_encode($server_info);
            exit();
        }
        // Otherwise, break out of switch to render HTML dashboard
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint not found: ' . $route
        ]);
        exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room Manager API Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #2ed573;
            --accent-glow: rgba(46, 213, 115, 0.15);
            --border-color: rgba(255, 255, 255, 0.08);
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(46, 213, 115, 0.08) 0%, transparent 40%);
        }
        .container {
            width: 100%;
            max-width: 800px;
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border-color);
            border-radius: 28px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
        }
        .title-group h1 {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .title-group p {
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 4px;
        }
        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--accent-glow);
            color: var(--accent);
            padding: 8px 16px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(46, 213, 115, 0.3);
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: var(--accent);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--accent);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.6; }
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-color);
            border-radius: 18px;
            padding: 20px;
        }
        .stat-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-secondary);
            margin-bottom: 6px;
            font-weight: 600;
        }
        .stat-value {
            font-size: 18px;
            font-weight: 700;
        }
        .stat-value.success {
            color: #2ed573;
        }
        .stat-value.danger {
            color: #ff4757;
        }
        .routes-section h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        .route-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.01);
            border: 1px solid var(--border-color);
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }
        .route-row:hover {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateX(4px);
        }
        .route-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .method-badge {
            font-size: 11px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            min-width: 70px;
            text-align: center;
        }
        .method-badge.post {
            background: rgba(99, 102, 241, 0.15);
            color: #6366f1;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .method-badge.get {
            background: rgba(46, 213, 115, 0.15);
            color: #2ed573;
            border: 1px solid rgba(46, 213, 115, 0.3);
        }
        .method-badge.mixed {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .route-path {
            font-family: monospace;
            font-size: 14px;
            font-weight: 600;
        }
        .route-desc {
            color: var(--text-secondary);
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title-group">
                <h1>Calculation Backend</h1>
                <p>Room Manager System & APIs</p>
            </div>
            <div class="status-badge">
                <div class="status-dot"></div>
                Online
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">PHP Engine Version</div>
                <div class="stat-value"><?php echo htmlspecialchars(PHP_VERSION); ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Database Connection</div>
                <?php if ($db_status === "Connected successfully"): ?>
                    <div class="stat-value success">✓ Connected</div>
                <?php else: ?>
                    <div class="stat-value danger">✗ Failed</div>
                    <div style="font-size: 11px; color: #ff4757; margin-top: 4px;"><?php echo htmlspecialchars($db_error); ?></div>
                <?php endif; ?>
            </div>
        </div>

        <div class="routes-section">
            <h2>Available API Endpoints</h2>
            <?php foreach ($server_info['endpoints'] as $ep): ?>
                <?php 
                    $methodClass = 'mixed';
                    if ($ep['method'] === 'POST') $methodClass = 'post';
                    elseif ($ep['method'] === 'GET') $methodClass = 'get';
                ?>
                <div class="route-row">
                    <div class="route-left">
                        <span class="method-badge <?php echo $methodClass; ?>"><?php echo htmlspecialchars($ep['method']); ?></span>
                        <span class="route-path"><?php echo htmlspecialchars($ep['path']); ?></span>
                    </div>
                    <span class="route-desc"><?php echo htmlspecialchars($ep['description']); ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</body>
</html>
