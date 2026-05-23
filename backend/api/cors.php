<?php
// Allow from any origin
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Populate $_GET manually if query string parameters are missing due to server routing/rewriting
if (empty($_GET) && isset($_SERVER['REQUEST_URI'])) {
    $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
    if ($queryString) {
        parse_str($queryString, $parsedParams);
        $_GET = array_merge($_GET, $parsedParams);
    }
}
?>
