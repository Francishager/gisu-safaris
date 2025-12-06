<?php

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

setCorsHeaders();
setSecurityHeaders();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

logEvent('info', 'Vacancy application API accessed', [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? ''),
]);

try {
    $db = getDbConnection();

    $db->exec("CREATE TABLE IF NOT EXISTS vacancy_applications (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        vacancy_id VARCHAR(100) NOT NULL,
        vacancy_title VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        national_id VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        cover_letter TEXT,
        cv_file_path TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'new',
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vacancy_applications_email (email),
        INDEX idx_vacancy_applications_vacancy (vacancy_id),
        INDEX idx_vacancy_applications_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $contentType = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'multipart/form-data') === false) {
        sendJsonResponse(null, 415, 'Unsupported Media Type: multipart/form-data required');
    }

    $requiredFields = ['firstName', 'lastName', 'email', 'nin', 'vacancyId'];
    $missing = [];
    foreach ($requiredFields as $field) {
        if (empty($_POST[$field])) {
            $missing[] = $field;
        }
    }

    if (!empty($missing)) {
        sendJsonResponse(['missing_fields' => $missing], 400, 'Missing required fields');
    }

    $data = [
        'first_name' => sanitizeInput($_POST['firstName']),
        'middle_name' => sanitizeInput($_POST['middleName'] ?? ''),
        'last_name' => sanitizeInput($_POST['lastName']),
        'national_id' => sanitizeInput($_POST['nin']),
        'email' => filter_var($_POST['email'], FILTER_SANITIZE_EMAIL),
        'phone' => sanitizeInput($_POST['phone'] ?? ''),
        'cover_letter' => sanitizeInput($_POST['coverLetter'] ?? ''),
        'vacancy_id' => sanitizeInput($_POST['vacancyId']),
        'vacancy_title' => sanitizeInput($_POST['vacancyTitle'] ?? ''),
    ];

    if (!isValidEmail($data['email'])) {
        sendJsonResponse(null, 400, 'Invalid email address');
    }

    if (empty($_FILES['cv']) || !is_array($_FILES['cv']) || ($_FILES['cv']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        sendJsonResponse(null, 400, 'Please upload your CV (PDF, DOC, or DOCX).');
    }

    $cvFile = $_FILES['cv'];

    if ($cvFile['size'] > UPLOAD_MAX_SIZE) {
        sendJsonResponse(null, 400, 'CV file is too large. Maximum size is 5MB.');
    }

    $originalName = $cvFile['name'] ?? '';
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedCvExtensions = ['pdf', 'doc', 'docx'];

    if (!in_array($extension, $allowedCvExtensions, true)) {
        sendJsonResponse(null, 400, 'Invalid CV format. Only PDF, DOC, and DOCX files are allowed.');
    }

    $uploadDir = rtrim(UPLOAD_PATH, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vacancies' . DIRECTORY_SEPARATOR;
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
            throw new Exception('Failed to create CV upload directory');
        }
    }

    $safeVacancyId = preg_replace('/[^A-Za-z0-9_\-]/', '_', $data['vacancy_id'] ?: 'vacancy');
    $safeEmailPart = preg_replace('/[^A-Za-z0-9_\-]/', '_', strstr($data['email'], '@', true) ?: 'applicant');
    $uniqueName = 'cv_' . $safeVacancyId . '_' . $safeEmailPart . '_' . bin2hex(random_bytes(4)) . '.' . $extension;

    $targetPath = $uploadDir . $uniqueName;
    $relativePath = 'vacancies/' . $uniqueName;

    if (!move_uploaded_file($cvFile['tmp_name'], $targetPath)) {
        sendJsonResponse(null, 500, 'Failed to save uploaded CV. Please try again.');
    }

    $stmt = $db->prepare("INSERT INTO vacancy_applications (
        vacancy_id,
        vacancy_title,
        first_name,
        middle_name,
        last_name,
        national_id,
        email,
        phone,
        cover_letter,
        cv_file_path,
        ip_address,
        user_agent,
        referrer_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $data['vacancy_id'],
        $data['vacancy_title'],
        $data['first_name'],
        $data['middle_name'],
        $data['last_name'],
        $data['national_id'],
        $data['email'],
        $data['phone'],
        $data['cover_letter'],
        $relativePath,
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? '',
    ]);

    $applicationId = $db->lastInsertId();

    try {
        $adminSubject = 'New Vacancy Application - ' . ($data['vacancy_title'] ?: $data['vacancy_id']) . ' - ' . $data['first_name'] . ' ' . $data['last_name'];
        $adminBody = generateVacancyAdminNotificationEmail($data, $applicationId, $relativePath, $targetPath);

        $sent = sendMultipleAdminEmails($adminSubject, $adminBody);

        logEvent('info', 'Vacancy application admin notification processed', [
            'application_id' => $applicationId,
            'vacancy_id' => $data['vacancy_id'],
            'recipients' => ADMIN_EMAIL_LIST,
            'sent' => $sent,
        ]);
    } catch (Exception $e) {
        logEvent('error', 'Failed to send vacancy admin email', [
            'application_id' => $applicationId,
            'error' => $e->getMessage(),
        ]);
    }

    logEvent('info', 'Vacancy application submitted successfully', [
        'application_id' => $applicationId,
        'vacancy_id' => $data['vacancy_id'],
        'email' => $data['email'],
    ]);

    sendJsonResponse([
        'application_id' => $applicationId,
        'message' => 'Thank you for your application. Our team will review your profile and contact you if you are shortlisted.',
    ], 200, 'Vacancy application submitted successfully');

} catch (PDOException $e) {
    logEvent('error', 'Database error in vacancy application', [
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'ip' => getClientIp(),
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');

} catch (Exception $e) {
    logEvent('error', 'Unexpected error in vacancy application', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}

function generateVacancyAdminNotificationEmail(array $data, $applicationId, string $cvRelativePath, string $cvAbsolutePath) {
    $h = static function ($v) {
        return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    };

    $vacancyLabel = $data['vacancy_title'] ?: $data['vacancy_id'];

    $cvInfo = $h($cvRelativePath);

    return "
        <h2>New Vacancy Application Received</h2>
        <p><strong>Application ID:</strong> {$h($applicationId)}</p>
        <p><strong>Vacancy:</strong> {$h($vacancyLabel)}</p>
        <hr>
        <h3>Applicant Details</h3>
        <p><strong>Name:</strong> {$h($data['first_name'])} " . ($h($data['middle_name']) ?: '') . " {$h($data['last_name'])}</p>
        <p><strong>Email:</strong> <a href=\"mailto:{$h($data['email'])}\">{$h($data['email'])}</a></p>
        <p><strong>Phone:</strong> " . ($h($data['phone']) ?: 'Not provided') . "</p>
        <p><strong>National ID (NIN):</strong> {$h($data['national_id'])}</p>
        <h3>Cover Letter</h3>
        <div style=\"background-color:#f9f9f9;padding:15px;border-left:4px solid #2E7D32;margin:10px 0;\">" .
            ($data['cover_letter'] ? nl2br($h($data['cover_letter'])) : 'No cover letter provided.') .
        "</div>
        <h3>CV File</h3>
        <p><strong>Stored Path:</strong> {$cvInfo}</p>
        <p style=\"font-size:12px;color:#666;\">Note: CV files are stored on the server under the uploads directory and are not publicly accessible. Please log into the server or file manager to download the CV.</p>
        <h3>System Information</h3>
        <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        <p><strong>IP Address:</strong> " . getClientIp() . "</p>
    ";
}

?>
