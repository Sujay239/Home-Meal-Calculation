<?php
date_default_timezone_set('Asia/Kolkata');

class Database {
    private $host = "sql210.infinityfree.com";
    private $db_name = "if0_41989865_home";
    private $username = "if0_41989865";
    private $password = "Sujay2004";
    public $conn;

    // Get the database connection
    public function getConnection() {
        $this->conn = null;

        // Check if running on localhost/local network
        $isLocal = false;
        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $httpHost = $_SERVER['HTTP_HOST'] ?? '';
        
        if ($serverName === 'localhost' || $serverName === '127.0.0.1' || 
            strpos($httpHost, 'localhost') !== false || strpos($httpHost, '127.0.0.1') !== false ||
            preg_match('/^(192\.168\.|10\.|172\.)/', $httpHost) || php_sapi_name() === 'cli') {
            $isLocal = true;
        }

        $host = $isLocal ? "127.0.0.1" : $this->host;
        $username = $isLocal ? "root" : $this->username;
        $password = $isLocal ? "" : $this->password;
        
        // Try these database names sequentially on local
        $db_names = $isLocal ? ["home", "if0_41989865_home", "room_db", "if0_40337381_room_db"] : [$this->db_name];

        
        $last_exception = null;
        foreach ($db_names as $db_name) {
            try {
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                
                $this->conn = new PDO(
                    "mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4",
                    $username,
                    $password,
                    $options
                );
                $this->conn->exec("SET time_zone = '+05:30'");
                return $this->conn;
            } catch (PDOException $exception) {
                $last_exception = $exception;
                // Try next database name if local
            }
        }

        if ($last_exception) {
            throw $last_exception;
        }

        return null;
    }

    // Special connection method for administrative tasks (like creating the database)
    public function getSystemConnection() {
        $this->conn = null;

        // Check if running on localhost/local network
        $isLocal = false;
        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $httpHost = $_SERVER['HTTP_HOST'] ?? '';
        
        if ($serverName === 'localhost' || $serverName === '127.0.0.1' || 
            strpos($httpHost, 'localhost') !== false || strpos($httpHost, '127.0.0.1') !== false ||
            preg_match('/^(192\.168\.|10\.|172\.)/', $httpHost) || php_sapi_name() === 'cli') {
            $isLocal = true;
        }

        $host = $isLocal ? "127.0.0.1" : $this->host;
        $username = $isLocal ? "root" : $this->username;
        $password = $isLocal ? "" : $this->password;

        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            // Connect without database name so we can create it
            $this->conn = new PDO(
                "mysql:host=" . $host . ";charset=utf8mb4",
                $username,
                $password,
                $options
            );
            $this->conn->exec("SET time_zone = '+05:30'");
        } catch (PDOException $exception) {
            throw $exception;
        }

        return $this->conn;
    }
}
?>
