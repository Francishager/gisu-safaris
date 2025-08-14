<?php
/**
 * Gisu Safaris Backend Configuration
 * Designed for cPanel hosting with PostgreSQL
 */

// Prevent direct access
if (!defined('GISU_SAFARIS_BACKEND')) {
    http_response_code(403);
    exit('Access denied');
}

// Environment configuration
define('ENVIRONMENT', $_ENV['ENVIRONMENT'] ?? 'production');
define('DEBUG', ENVIRONMENT === 'development');

// Database Configuration (PostgreSQL)
// cPanel PostgreSQL database credentials
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['DB_PORT'] ?? '5432');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'gisusafaris_gisu_safaris_db');
define('DB_USER', $_ENV['DB_USER'] ?? 'gisusafaris_gisu_admin');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'x~}PqR+ZQu,r_)V5');

// Email Configuration (for cPanel hosting)
define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? 'localhost');
define('SMTP_PORT', $_ENV['SMTP_PORT'] ?? 587);
define('SMTP_USER', $_ENV['SMTP_USER'] ?? 'noreply@gisusafaris.com');
define('SMTP_PASS', $_ENV['SMTP_PASS'] ?? 'your_email_password');
define('SMTP_FROM_EMAIL', 'noreply@gisusafaris.com');
define('SMTP_FROM_NAME', 'Gisu Safaris');

// WhatsApp Integration Configuration
define('WHATSAPP_PHONE', '+256780950555'); // Your WhatsApp Business number
define('WHATSAPP_API_URL', 'https://api.whatsapp.com/send');

// Security Configuration
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your-jwt-secret-key-here-change-in-production');
define('API_KEY', $_ENV['API_KEY'] ?? 'gisu_safaris_api_key_2024');
define('CSRF_TOKEN_NAME', 'gisu_csrf_token');

// File Upload Configuration
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);
define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// Rate Limiting
define('RATE_LIMIT_REQUESTS', 60); // Requests per hour per IP
define('RATE_LIMIT_WINDOW', 3600); // 1 hour in seconds

// Application Settings
define('APP_NAME', 'Gisu Safaris Backend');
define('APP_VERSION', '1.0.0');
define('DEFAULT_TIMEZONE', 'Africa/Kampala');
define('DATE_FORMAT', 'Y-m-d H:i:s');

// URLs
define('FRONTEND_URL', $_ENV['FRONTEND_URL'] ?? 'https://gisusafaris.com');
define('ADMIN_URL', $_ENV['ADMIN_URL'] ?? 'https://gisusafaris.com/admin');

// Notification Settings
define('ADMIN_EMAIL', 'admin@gisusafaris.com');
define('BOOKING_NOTIFICATION_EMAIL', 'bookings@gisusafaris.com');
define('CONTACT_NOTIFICATION_EMAIL', 'info@gisusafaris.com');

// CORS Configuration
define('CORS_ORIGINS', [
    'https://gisusafaris.com',
    'https://www.gisusafaris.com',
    'http://localhost:3000', // For development
    'http://localhost:8080'  // For development
]);

// Session Configuration
define('SESSION_LIFETIME', 7200); // 2 hours
define('SESSION_NAME', 'gisu_safaris_session');

// Cache Configuration
define('CACHE_ENABLED', true);
define('CACHE_TTL', 3600); // 1 hour

// Error Handling
if (DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/../logs/error.log');
}

// Set timezone
date_default_timezone_set(DEFAULT_TIMEZONE);

// Function to get database connection
function getDbConnection() {
    static $connection = null;
    
    if ($connection === null) {
        try {
            $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false
            ];
            
            $connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            // Set PostgreSQL specific settings
            $connection->exec("SET TIME ZONE 'UTC'");
            $connection->exec("SET search_path TO public");
            
        } catch (PDOException $e) {
            if (DEBUG) {
                die('Database Connection Failed: ' . $e->getMessage());
            } else {
                error_log('Database Connection Error: ' . $e->getMessage());
                http_response_code(500);
                die('Database connection error');
            }
        }
    }
    
    return $connection;
}

// Function to validate API key
function validateApiKey($provided_key) {
    return hash_equals(API_KEY, $provided_key);
}

// Function to generate CSRF token
function generateCsrfToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION[CSRF_TOKEN_NAME];
}

// Function to validate CSRF token
function validateCsrfToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

// Function to get client IP address
function getClientIp() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

// Function to log system events
function logEvent($level, $message, $context = [], $user_id = null) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            INSERT INTO system_logs (log_level, message, context, ip_address, user_id)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $level,
            $message,
            json_encode($context),
            getClientIp(),
            $user_id
        ]);
        
    } catch (Exception $e) {
        error_log("Failed to log event: " . $e->getMessage());
    }
}

// Function to send JSON response
function sendJsonResponse($data, $status_code = 200, $message = '') {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    
    $response = [
        'success' => $status_code < 400,
        'status_code' => $status_code,
        'timestamp' => date('c'),
        'data' => $data
    ];
    
    if (!empty($message)) {
        $response['message'] = $message;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Function to validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Function to sanitize input
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Rate limiting function
function checkRateLimit($identifier = null) {
    if (!$identifier) {
        $identifier = getClientIp();
    }
    
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT COUNT(*) as request_count
            FROM system_logs
            WHERE ip_address = ? AND created_at > NOW() - INTERVAL ? SECOND
        ");
        $stmt->execute([$identifier, RATE_LIMIT_WINDOW]);
        $result = $stmt->fetch();
        
        if ($result['request_count'] > RATE_LIMIT_REQUESTS) {
            http_response_code(429);
            sendJsonResponse(null, 429, 'Rate limit exceeded. Please try again later.');
        }
        
    } catch (Exception $e) {
        // If rate limiting fails, log but don't block request
        logEvent('warning', 'Rate limiting check failed: ' . $e->getMessage());
    }
}

// CORS headers function
function setCorsHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, CORS_ORIGINS)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 3600');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Initialize session
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'domain' => '',
            'secure' => !DEBUG,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        session_start();
    }
}

// Auto-load configuration based on hosting environment
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !strpos($line, '#') === 0) {
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

// Ensure upload directory exists
if (!is_dir(UPLOAD_PATH)) {
    mkdir(UPLOAD_PATH, 0755, true);
}

// Ensure logs directory exists
$logs_dir = __DIR__ . '/../logs/';
if (!is_dir($logs_dir)) {
    mkdir($logs_dir, 0755, true);
}
?>
