<?php
/**
 * Multi-Country Tour Booking API
 * Handles bookings for combined safari packages across Uganda, Kenya, Tanzania, and Rwanda
 * 
 * @author Gisu Safaris
 * @version 1.0
 */

// Include configuration and helper functions
require_once '../config/config.php';
require_once '../includes/email.php';

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'booking_id' => null,
    'errors' => []
];

try {
    // Set proper headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
    
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST requests are allowed');
    }
    
    // Check rate limiting
    if (!checkRateLimit('multi-country-booking', 5, 3600)) { // 5 bookings per hour per IP
        throw new Exception('Too many booking attempts. Please try again later.');
    }
    
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data received');
    }
    
    // Validation rules for multi-country bookings
    $required_fields = [
        'first_name' => 'First name',
        'last_name' => 'Last name',
        'email' => 'Email address',
        'country' => 'Country of residence',
        'tour_combination' => 'Tour combination',
        'duration' => 'Tour duration',
        'group_size' => 'Group size',
        'travel_date' => 'Preferred travel date'
    ];
    
    $errors = [];
    
    // Validate required fields
    foreach ($required_fields as $field => $label) {
        if (empty($input[$field])) {
            $errors[] = "$label is required";
        }
    }
    
    // Additional validation
    if (!empty($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please provide a valid email address';
    }
    
    // Validate tour combination
    $valid_combinations = [
        'uganda-kenya',
        'uganda-tanzania', 
        'uganda-rwanda',
        'kenya-tanzania',
        'kenya-rwanda',
        'tanzania-rwanda',
        'uganda-kenya-tanzania',
        'uganda-kenya-rwanda',
        'uganda-tanzania-rwanda',
        'kenya-tanzania-rwanda',
        'east-africa-grand-tour' // Uganda + Kenya + Tanzania + Rwanda
    ];
    
    if (!empty($input['tour_combination']) && !in_array($input['tour_combination'], $valid_combinations)) {
        $errors[] = 'Invalid tour combination selected';
    }
    
    // Validate travel date (must be at least 30 days in advance for multi-country tours)
    if (!empty($input['travel_date'])) {
        $travel_date = DateTime::createFromFormat('Y-m-d', $input['travel_date']);
        $min_date = new DateTime('+30 days');
        
        if (!$travel_date || $travel_date < $min_date) {
            $errors[] = 'Multi-country tours require at least 30 days advance booking';
        }
    }
    
    // If there are validation errors, return them
    if (!empty($errors)) {
        $response['errors'] = $errors;
        $response['message'] = 'Please correct the following errors:';
        echo json_encode($response);
        exit();
    }
    
    // Sanitize input data
    $booking_data = [
        'first_name' => sanitizeInput($input['first_name']),
        'last_name' => sanitizeInput($input['last_name']),
        'email' => strtolower(trim($input['email'])),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'country' => sanitizeInput($input['country']),
        'tour_combination' => $input['tour_combination'],
        'duration' => sanitizeInput($input['duration']),
        'group_size' => sanitizeInput($input['group_size']),
        'travel_date' => $input['travel_date'],
        'budget_range' => sanitizeInput($input['budget_range'] ?? ''),
        'accommodation_level' => sanitizeInput($input['accommodation_level'] ?? 'mid-range'),
        'countries_included' => getCountriesFromCombination($input['tour_combination']),
        'primary_interests' => json_encode($input['primary_interests'] ?? []),
        'special_requirements' => sanitizeInput($input['special_requirements'] ?? ''),
        'dietary_requirements' => sanitizeInput($input['dietary_requirements'] ?? ''),
        'mobility_requirements' => sanitizeInput($input['mobility_requirements'] ?? ''),
        'gorilla_permit_required' => isset($input['gorilla_permit_required']) ? (bool)$input['gorilla_permit_required'] : false,
        'message' => sanitizeInput($input['message'] ?? ''),
        'newsletter_opt_in' => isset($input['newsletter_opt_in']) ? (bool)$input['newsletter_opt_in'] : false,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'referrer_url' => $_SERVER['HTTP_REFERER'] ?? ''
    ];
    
    // Generate unique booking ID
    $booking_id = generateUniqueId('MCT'); // MCT = Multi-Country Tour
    
    // Start database transaction
    $pdo->beginTransaction();
    
    try {
        // Insert booking into database
        $sql = "INSERT INTO multi_country_bookings (
            booking_id, first_name, last_name, email, phone, country, 
            tour_combination, duration, group_size, travel_date, 
            budget_range, accommodation_level, countries_included, 
            primary_interests, special_requirements, dietary_requirements,
            mobility_requirements, gorilla_permit_required, message, 
            newsletter_opt_in, booking_status, ip_address, user_agent, referrer_url
        ) VALUES (
            :booking_id, :first_name, :last_name, :email, :phone, :country,
            :tour_combination, :duration, :group_size, :travel_date,
            :budget_range, :accommodation_level, :countries_included,
            :primary_interests, :special_requirements, :dietary_requirements,
            :mobility_requirements, :gorilla_permit_required, :message,
            :newsletter_opt_in, 'pending', :ip_address, :user_agent, :referrer_url
        )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':booking_id', $booking_id);
        $stmt->bindParam(':first_name', $booking_data['first_name']);
        $stmt->bindParam(':last_name', $booking_data['last_name']);
        $stmt->bindParam(':email', $booking_data['email']);
        $stmt->bindParam(':phone', $booking_data['phone']);
        $stmt->bindParam(':country', $booking_data['country']);
        $stmt->bindParam(':tour_combination', $booking_data['tour_combination']);
        $stmt->bindParam(':duration', $booking_data['duration']);
        $stmt->bindParam(':group_size', $booking_data['group_size']);
        $stmt->bindParam(':travel_date', $booking_data['travel_date']);
        $stmt->bindParam(':budget_range', $booking_data['budget_range']);
        $stmt->bindParam(':accommodation_level', $booking_data['accommodation_level']);
        $stmt->bindParam(':countries_included', $booking_data['countries_included']);
        $stmt->bindParam(':primary_interests', $booking_data['primary_interests']);
        $stmt->bindParam(':special_requirements', $booking_data['special_requirements']);
        $stmt->bindParam(':dietary_requirements', $booking_data['dietary_requirements']);
        $stmt->bindParam(':mobility_requirements', $booking_data['mobility_requirements']);
        $stmt->bindParam(':gorilla_permit_required', $booking_data['gorilla_permit_required'], PDO::PARAM_BOOL);
        $stmt->bindParam(':message', $booking_data['message']);
        $stmt->bindParam(':newsletter_opt_in', $booking_data['newsletter_opt_in'], PDO::PARAM_BOOL);
        $stmt->bindParam(':ip_address', $booking_data['ip_address']);
        $stmt->bindParam(':user_agent', $booking_data['user_agent']);
        $stmt->bindParam(':referrer_url', $booking_data['referrer_url']);
        
        $stmt->execute();
        
        // Handle newsletter subscription if opted in
        if ($booking_data['newsletter_opt_in']) {
            try {
                $newsletter_sql = "INSERT INTO newsletter_subscriptions (email, subscription_source, ip_address, user_agent) 
                                 VALUES (:email, 'multi-country-booking', :ip_address, :user_agent) 
                                 ON CONFLICT (email) DO NOTHING";
                $newsletter_stmt = $pdo->prepare($newsletter_sql);
                $newsletter_stmt->execute([
                    ':email' => $booking_data['email'],
                    ':ip_address' => $booking_data['ip_address'],
                    ':user_agent' => $booking_data['user_agent']
                ]);
            } catch (Exception $e) {
                // Newsletter subscription failure shouldn't fail the booking
                logError('Newsletter subscription failed for multi-country booking: ' . $e->getMessage());
            }
        }
        
        // Send confirmation emails
        $customer_template_data = [
            'first_name' => $booking_data['first_name'],
            'last_name' => $booking_data['last_name'],
            'booking_id' => $booking_id,
            'tour_combination' => formatTourCombination($booking_data['tour_combination']),
            'countries_included' => $booking_data['countries_included'],
            'duration' => $booking_data['duration'],
            'group_size' => $booking_data['group_size'],
            'travel_date' => date('F j, Y', strtotime($booking_data['travel_date'])),
            'accommodation_level' => ucwords(str_replace('-', ' ', $booking_data['accommodation_level']))
        ];
        
        // Send customer confirmation email
        $customer_sent = sendTemplatedEmail(
            $booking_data['email'],
            'multi_country_booking_confirmation',
            $customer_template_data
        );
        
        // Send admin notification email
        $admin_template_data = array_merge($customer_template_data, [
            'email' => $booking_data['email'],
            'phone' => $booking_data['phone'],
            'country' => $booking_data['country'],
            'budget_range' => $booking_data['budget_range'],
            'special_requirements' => $booking_data['special_requirements'],
            'message' => $booking_data['message'],
            'booking_url' => ADMIN_URL . '/bookings/view.php?id=' . $booking_id
        ]);
        
        $admin_sent = sendMultipleAdminEmails(
            'New Multi-Country Booking - ' . $booking_data['tour_combination'] . ' - Booking #' . $booking_id,
            'New Multi-Country Safari Booking from ' . $booking_data['first_name'] . ' ' . $booking_data['last_name'],
            $admin_template_data
        );
        
        // Commit transaction
        $pdo->commit();
        
        // Log successful booking
        logInfo('Multi-country tour booking created', [
            'booking_id' => $booking_id,
            'tour_combination' => $booking_data['tour_combination'],
            'email' => $booking_data['email'],
            'customer_email_sent' => $customer_sent,
            'admin_email_sent' => $admin_sent
        ]);
        
        // Successful response
        $response['success'] = true;
        $response['message'] = 'Your multi-country safari booking has been received successfully! You will receive a confirmation email shortly with next steps.';
        $response['booking_id'] = $booking_id;
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log error
    logError('Multi-country booking API error: ' . $e->getMessage(), [
        'input_data' => $input ?? null,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    $response['message'] = 'Sorry, there was an error processing your booking. Please try again or contact us directly.';
    
    // Don't expose internal errors in production
    if (defined('DEBUG') && DEBUG) {
        $response['debug'] = $e->getMessage();
    }
}

// Return response
http_response_code($response['success'] ? 200 : 400);
echo json_encode($response);

/**
 * Helper function to get countries from tour combination
 */
function getCountriesFromCombination($combination) {
    $combinations = [
        'uganda-kenya' => 'Uganda, Kenya',
        'uganda-tanzania' => 'Uganda, Tanzania',
        'uganda-rwanda' => 'Uganda, Rwanda', 
        'kenya-tanzania' => 'Kenya, Tanzania',
        'kenya-rwanda' => 'Kenya, Rwanda',
        'tanzania-rwanda' => 'Tanzania, Rwanda',
        'uganda-kenya-tanzania' => 'Uganda, Kenya, Tanzania',
        'uganda-kenya-rwanda' => 'Uganda, Kenya, Rwanda',
        'uganda-tanzania-rwanda' => 'Uganda, Tanzania, Rwanda',
        'kenya-tanzania-rwanda' => 'Kenya, Tanzania, Rwanda',
        'east-africa-grand-tour' => 'Uganda, Kenya, Tanzania, Rwanda'
    ];
    
    return $combinations[$combination] ?? $combination;
}

/**
 * Helper function to format tour combination for display
 */
function formatTourCombination($combination) {
    $formatted = [
        'uganda-kenya' => 'Uganda & Kenya Safari Combination',
        'uganda-tanzania' => 'Uganda & Tanzania Safari Experience',
        'uganda-rwanda' => 'Uganda & Rwanda Gorilla Adventure',
        'kenya-tanzania' => 'Kenya & Tanzania Big Five Safari',
        'kenya-rwanda' => 'Kenya & Rwanda Wildlife & Gorilla Tour',
        'tanzania-rwanda' => 'Tanzania & Rwanda Safari & Gorilla Experience',
        'uganda-kenya-tanzania' => 'Uganda, Kenya & Tanzania Grand Safari',
        'uganda-kenya-rwanda' => 'Uganda, Kenya & Rwanda Ultimate Adventure',
        'uganda-tanzania-rwanda' => 'Uganda, Tanzania & Rwanda Comprehensive Tour',
        'kenya-tanzania-rwanda' => 'Kenya, Tanzania & Rwanda Premium Safari',
        'east-africa-grand-tour' => 'East Africa Grand Safari (4 Countries)'
    ];
    
    return $formatted[$combination] ?? ucwords(str_replace('-', ' & ', $combination));
}

/**
 * Generate unique booking ID
 */
function generateUniqueId($prefix = 'MCT') {
    return $prefix . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
}
?>
