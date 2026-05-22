<?php
/**
 * Database Setup & Seed Importer
 * This script initializes the "home" database and seeds it from "if0_40337381_room_db.sql".
 */

require_once __DIR__ . '/config/database.php';

// Determine if we are running in the CLI or Browser
$is_cli = (php_sapi_name() === 'cli');

if (!$is_cli) {
    header("Content-Type: text/html; charset=UTF-8");
}

$log = [];
function add_log($message, $type = 'info') {
    global $log, $is_cli;
    $timestamp = date('H:i:s');
    $log[] = ['time' => $timestamp, 'text' => $message, 'type' => $type];
    
    if ($is_cli) {
        $color = "\033[0m"; // default
        if ($type === 'success') $color = "\033[32m"; // green
        if ($type === 'error') $color = "\033[31m"; // red
        if ($type === 'warning') $color = "\033[33m"; // yellow
        echo "[{$timestamp}] {$color}{$message}\033[0m\n";
    }
}

try {
    add_log("Initializing database setup procedure...");
    
    $database = new Database();
    
    // 1. Establish administrative connection (without selecting a DB)
    add_log("Connecting to local MySQL server at 127.0.0.1...");
    $sysConn = $database->getSystemConnection();
    add_log("Connected successfully to MySQL server.", "success");
    
    // 2. Create the database "home" if it doesn't exist
    add_log("Checking database existence...");
    $sysConn->exec("CREATE DATABASE IF NOT EXISTS `home` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    add_log("Database 'home' exists or was created successfully.", "success");
    
    // 3. Reconnect to the newly created/existing "home" database
    add_log("Switching connection context to database 'home'...");
    $conn = $database->getConnection();
    add_log("Connected to database 'home' successfully.", "success");
    
    // 4. Read the seed SQL file
    $sqlFilePath = __DIR__ . '/../if0_40337381_room_db.sql';
    add_log("Locating SQL schema file at: " . realpath($sqlFilePath));
    
    if (!file_exists($sqlFilePath)) {
        throw new Exception("SQL seed file not found at " . $sqlFilePath);
    }
    
    $sqlContent = file_get_contents($sqlFilePath);
    add_log("SQL seed file loaded (" . number_format(strlen($sqlContent)) . " bytes).", "success");
    
    // 5. Parse and execute the SQL script
    // To be safe and give verbose feedback, we will split the queries by semicolon.
    // However, we need to ignore semicolons inside comments or strings.
    // A standard clean-up:
    add_log("Parsing SQL commands...");
    
    // Remove comments and empty lines to make parsing queries accurate
    $lines = explode("\n", $sqlContent);
    $cleanedSql = "";
    $in_multiline_comment = false;
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // Skip empty lines
        if ($line === "") continue;
        
        // Skip single line comments
        if (strpos($line, '--') === 0 || strpos($line, '#') === 0) continue;
        
        // Handle multi-line comment starts
        if (strpos($line, '/*') === 0) {
            $in_multiline_comment = true;
            if (strpos($line, '*/') !== false) {
                $in_multiline_comment = false; // single line block comment
            }
            continue;
        }
        
        // Handle multi-line comment ends
        if ($in_multiline_comment) {
            if (strpos($line, '*/') !== false) {
                $in_multiline_comment = false;
            }
            continue;
        }
        
        $cleanedSql .= $line . "\n";
    }
    
    // Split queries by semicolon
    // We will split by semicolon followed by newline or end of string to avoid splitting inside text values
    $queries = preg_split('/;(?=\s*$|\s*\n)/m', $cleanedSql);
    
    add_log("Parsed " . count($queries) . " individual SQL queries to execute.");
    
    $executedCount = 0;
    
    foreach ($queries as $query) {
        $query = trim($query);
        if ($query === "") continue;
        
        // Show context of major query operations
        if (stripos($query, 'CREATE TABLE') === 0) {
            preg_match('/CREATE TABLE `?([a-zA-Z0-9_]+)`?/i', $query, $matches);
            $tableName = isset($matches[1]) ? $matches[1] : "unknown";
            add_log("Creating table '{$tableName}'...");
        } elseif (stripos($query, 'INSERT INTO') === 0 && $executedCount % 100 === 0) {
            preg_match('/INSERT INTO `?([a-zA-Z0-9_]+)`?/i', $query, $matches);
            $tableName = isset($matches[1]) ? $matches[1] : "unknown";
            add_log("Seeding data into table '{$tableName}'...");
        }
        
        try {
            @$conn->exec($query);
            $executedCount++;
        } catch (PDOException $qe) {
            // Ignore code 42S01 (Table already exists), 42S11 (Index already exists), and 42S21 (Column already exists)
            // Also ignore code 23000 / 1062 (Integrity constraint violation - duplicate entry)
            $errCode = $qe->getCode();
            $errMessage = $qe->getMessage();
            if ($errCode === '42S01' || $errCode === '42S11' || $errCode === '42S21' || $errCode === '23000' ||
                strpos($errMessage, 'already exists') !== false || 
                strpos($errMessage, 'Duplicate entry') !== false ||
                strpos($errMessage, 'Multiple primary key') !== false) {
                add_log("Warning: Table/index already exists, duplicate key, or primary key defined. Skipping query.", "warning");
            } else {
                throw $qe;
            }
        }
    }
    
    add_log("Database schema imported and seeded successfully. Executed {$executedCount} queries.", "success");
    add_log("Database is fully operational!", "success");

} catch (Exception $e) {
    add_log("CRITICAL ERROR: " . $e->getMessage(), "error");
}

if (!$is_cli):
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room Manager - Database Setup</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
        }
        .container {
            width: 100%;
            max-width: 800px;
            background-color: #1e293b;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border: 1px solid #334155;
        }
        h1 {
            margin-top: 0;
            font-weight: 800;
            font-size: 32px;
            background: linear-gradient(to right, #2ed573, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        p.subtitle {
            color: #94a3b8;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .log-panel {
            background-color: #0b0f19;
            border-radius: 16px;
            padding: 24px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #1e293b;
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6);
        }
        .log-entry {
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.02);
            padding-bottom: 4px;
        }
        .time {
            color: #64748b;
            margin-right: 12px;
        }
        .info {
            color: #e2e8f0;
        }
        .success {
            color: #2ed573;
            font-weight: 600;
        }
        .warning {
            color: #f59e0b;
        }
        .error {
            color: #ef4444;
            font-weight: 600;
        }
        .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
        }
        .status-success {
            background-color: rgba(46, 213, 115, 0.15);
            color: #2ed573;
            border: 1px solid rgba(46, 213, 115, 0.3);
        }
        .status-error {
            background-color: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .btn {
            background: linear-gradient(to right, #2ed573, #26af5f);
            color: #fff;
            border: none;
            padding: 12px 24px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.2s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(46, 213, 115, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛠️ Room Manager Database Installer</h1>
        <p class="subtitle">Sets up local MySQL server database, structure schema, and seeding data dynamically.</p>
        
        <div class="log-panel">
            <?php foreach ($log as $entry): ?>
                <div class="log-entry">
                    <span class="time">[<?= htmlspecialchars($entry['time']) ?>]</span>
                    <span class="<?= htmlspecialchars($entry['type']) ?>"><?= htmlspecialchars($entry['text']) ?></span>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div class="footer">
            <?php 
            $errors = array_filter($log, function($e) { return $e['type'] === 'error'; });
            $is_success = count($errors) === 0;
            ?>
            <div class="status-badge <?= $is_success ? 'status-success' : 'status-error' ?>">
                <span class="dot">●</span>
                <span><?= $is_success ? 'Setup Successful' : 'Setup Failed' ?></span>
            </div>
            
            <button onclick="window.location.reload();" class="btn">Re-run Installation</button>
        </div>
    </div>
</body>
</html>
<?php endif; ?>
