<?php
class Database {
    private $host = "127.0.0.1";
    private $db_name = "home";
    private $username = "root";
    private $password = "";
    public $conn;

    // Get the database connection
    public function getConnection() {
        $this->conn = null;

        try {
            // Set options for safe, secure, and robust connection
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                $options
            );
        } catch (PDOException $exception) {
            // If connection failed because database doesn't exist, we might want to connect to MySQL directly
            // to allow database creation during setup.
            throw $exception;
        }

        return $this->conn;
    }

    // Special connection method for administrative tasks (like creating the database)
    Public function getSystemConnection() {
        $this->conn = null;

        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            // Connect without database name so we can create it
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";charset=utf8mb4",
                $this->username,
                $this->password,
                $options
            );
        } catch (PDOException $exception) {
            throw $exception;
        }

        return $this->conn;
    }
}
?>
