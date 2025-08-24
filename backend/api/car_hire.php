<?php
/**
 * Car Hire Enquiry API Endpoint
 * Accepts structured car hire booking/custom requests and stores all fields.
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// CORS, rate limit, session
setCorsHeaders();
checkRateLimit();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

logEvent('info', 'Car hire API accessed', ['method' => 'POST']);

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }

    // Required basics
    $required = ['firstName', 'email'];
    $missing = [];
    foreach ($required as $f) { if (empty($input[$f])) $missing[] = $f; }
    if ($missing) {
        sendJsonResponse(['missing_fields' => $missing], 400, 'Missing required fields');
    }

    // Sanitize inputs
    $data = [
        'first_name' => sanitizeInput($input['firstName']),
        'last_name' => sanitizeInput($input['lastName'] ?? ''),
        'email' => filter_var($input['email'], FILTER_SANITIZE_EMAIL),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'country' => sanitizeInput($input['country'] ?? ''),
        'vehicle_type' => sanitizeInput($input['vehicleType'] ?? ''),
        'rental_option' => sanitizeInput($input['rentalOption'] ?? ''),
        'pickup_date' => sanitizeInput($input['pickupDate'] ?? ''),
        'return_date' => sanitizeInput($input['returnDate'] ?? ''),
        'passengers' => sanitizeInput($input['passengers'] ?? ''),
        'pickup_location' => sanitizeInput($input['pickupLocation'] ?? ''),
        'dropoff_location' => sanitizeInput($input['dropoffLocation'] ?? ''),
        'license' => sanitizeInput($input['license'] ?? ''),
        'notes' => sanitizeInput($input['notes'] ?? ''),
        'requirements' => sanitizeInput($input['requirements'] ?? ''),
        'enquiry_type' => sanitizeInput($input['enquiryType'] ?? 'car_hire'), // car_hire_booking | car_hire_custom
        'subject' => sanitizeInput($input['subject'] ?? 'Car Hire Enquiry'),
        'referrer_page' => sanitizeInput($input['referrerPage'] ?? ''),
    ];

    if (!isValidEmail($data['email'])) {
        sendJsonResponse(null, 400, 'Invalid email address');
    }

    // DB
    $db = getDbConnection();

    // Table is managed in backend/database/schema.sql (car_hire_enquiries).
    // Ensure migrations have been applied before using this endpoint.

    // Insert
    $stmt = $db->prepare("INSERT INTO car_hire_enquiries (
        first_name, last_name, email, phone, country, subject, enquiry_type,
        vehicle_type, rental_option, pickup_date, return_date, passengers,
        pickup_location, dropoff_location, license, notes, requirements,
        referrer_page, ip_address, user_agent
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, '')::date, NULLIF(?, '')::date, ?, ?, ?, ?, ?, ?, ?, ?, ?
    ) RETURNING id");

    $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['phone'],
        $data['country'],
        $data['subject'],
        $data['enquiry_type'],
        $data['vehicle_type'],
        $data['rental_option'],
        $data['pickup_date'],
        $data['return_date'],
        $data['passengers'],
        $data['pickup_location'],
        $data['dropoff_location'],
        $data['license'],
        $data['notes'],
        $data['requirements'],
        $data['referrer_page'],
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);

    $row = $stmt->fetch();
    $enquiry_id = $row['id'] ?? null;

    // Emails
    try {
        $email_data = [
            'first_name' => $data['first_name'],
            'subject' => $data['subject'],
            'enquiry_type' => $data['enquiry_type'],
            'enquiry_id' => $enquiry_id
        ];
        // Reuse generic template if no car-hire specific one
        sendTemplateEmail(
            $data['email'],
            trim($data['first_name'] . ' ' . $data['last_name']),
            'enquiry_confirmation',
            $email_data
        );
    } catch (Exception $e) {
        logEvent('warning', 'Failed to send car hire confirmation email', ['error' => $e->getMessage(), 'enquiry_id' => $enquiry_id]);
    }

    try {
        $admin_subject = "New Car Hire Enquiry - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateCarHireAdminEmail($data, $enquiry_id);
        sendMultipleAdminEmails($admin_subject, $admin_message);
    } catch (Exception $e) {
        logEvent('warning', 'Failed to send car hire admin notification', ['error' => $e->getMessage(), 'enquiry_id' => $enquiry_id]);
    }

    logEvent('info', 'Car hire enquiry stored', ['enquiry_id' => $enquiry_id, 'email' => $data['email']]);

    sendJsonResponse([
        'enquiry_id' => $enquiry_id,
        'message' => 'Car hire enquiry saved successfully.'
    ], 200, 'OK');

} catch (PDOException $e) {
    logEvent('error', 'DB error in car hire', ['error' => $e->getMessage(), 'code' => $e->getCode()]);
    sendJsonResponse(null, 500, 'Database error occurred');
} catch (Exception $e) {
    logEvent('error', 'Unexpected error in car hire', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}

function generateCarHireAdminEmail($d, $id) {
    $lines = [
        '<h2>New Car Hire Enquiry</h2>',
        '<p><strong>ID:</strong> #' . htmlspecialchars($id ?? 'n/a') . '</p>',
        '<hr>',
        '<h3>Customer</h3>',
        '<p><strong>Name:</strong> ' . htmlspecialchars($d['first_name'] . ' ' . $d['last_name']) . '</p>',
        '<p><strong>Email:</strong> <a href="mailto:' . htmlspecialchars($d['email']) . '">' . htmlspecialchars($d['email']) . '</a></p>',
        '<p><strong>Phone:</strong> ' . htmlspecialchars($d['phone'] ?: 'Not provided') . '</p>',
        '<p><strong>Country:</strong> ' . htmlspecialchars($d['country'] ?: 'Not provided') . '</p>',
        '<h3>Trip Details</h3>',
        '<p><strong>Vehicle:</strong> ' . htmlspecialchars($d['vehicle_type'] ?: 'N/A') . '</p>',
        '<p><strong>Option:</strong> ' . htmlspecialchars($d['rental_option'] ?: 'N/A') . '</p>',
        '<p><strong>Pickup:</strong> ' . htmlspecialchars($d['pickup_date'] ?: 'N/A') . ' ' . htmlspecialchars($d['pickup_location'] ?: '') . '</p>',
        '<p><strong>Return:</strong> ' . htmlspecialchars($d['return_date'] ?: 'N/A') . ' ' . htmlspecialchars($d['dropoff_location'] ?: '') . '</p>',
        '<p><strong>Passengers:</strong> ' . htmlspecialchars($d['passengers'] ?: 'N/A') . '</p>',
        '<p><strong>License:</strong> ' . htmlspecialchars($d['license'] ?: 'N/A') . '</p>',
        '<p><strong>Notes:</strong><br>' . nl2br(htmlspecialchars($d['notes'] ?: '')) . '</p>',
        '<p><strong>Requirements:</strong><br>' . nl2br(htmlspecialchars($d['requirements'] ?: '')) . '</p>',
        '<p><strong>Referrer Page:</strong> ' . htmlspecialchars($d['referrer_page'] ?: 'N/A') . '</p>',
        '<p><strong>Type:</strong> ' . htmlspecialchars($d['enquiry_type']) . '</p>'
    ];
    return implode("\n", $lines);
}
