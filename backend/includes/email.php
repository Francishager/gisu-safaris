<?php
/**
 * Email Helper Functions
 * Handles email sending, templates, and related utilities
 */

// Prevent direct access
if (!defined('GISU_SAFARIS_BACKEND')) {
    http_response_code(403);
    exit('Access denied');
}

/**
 * Send email using PHPMailer or basic mail function
 */
function sendEmail($to, $name, $subject, $html_body, $text_body = null) {
    // For cPanel hosting, we'll use the basic mail() function with proper headers
    // In production, consider using PHPMailer for better reliability
    
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=utf-8';
    $headers[] = 'From: ' . SMTP_FROM_NAME . ' <' . SMTP_FROM_EMAIL . '>';
    $headers[] = 'Reply-To: ' . SMTP_FROM_EMAIL;
    $headers[] = 'X-Mailer: Gisu Safaris Backend';
    
    $full_to = empty($name) ? $to : $name . ' <' . $to . '>';
    
    // Use text body as fallback if html fails
    $body = $html_body;
    if (empty($body) && !empty($text_body)) {
        $body = $text_body;
        $headers[1] = 'Content-type: text/plain; charset=utf-8';
    }
    
    $result = mail($full_to, $subject, $body, implode("\r\n", $headers));
    
    if (!$result) {
        throw new Exception('Failed to send email to ' . $to);
    }
    
    return true;
}

/**
 * Send email using predefined templates
 */
function sendTemplateEmail($to, $name, $template, $data = []) {
    $template_config = getEmailTemplate($template);
    
    if (!$template_config) {
        throw new Exception('Email template not found: ' . $template);
    }
    
    $subject = replacePlaceholders($template_config['subject'], $data);
    $html_body = replacePlaceholders($template_config['html'], $data);
    $text_body = replacePlaceholders($template_config['text'], $data);
    
    return sendEmail($to, $name, $subject, $html_body, $text_body);
}

/**
 * Replace placeholders in email content
 */
function replacePlaceholders($content, $data) {
    foreach ($data as $key => $value) {
        $content = str_replace('{{' . $key . '}}', $value, $content);
    }
    
    // Replace default placeholders
    $content = str_replace('{{site_name}}', 'Gisu Safaris', $content);
    $content = str_replace('{{site_url}}', FRONTEND_URL, $content);
    $content = str_replace('{{admin_email}}', ADMIN_EMAIL, $content);
    $content = str_replace('{{current_year}}', date('Y'), $content);
    
    return $content;
}

/**
 * Get email template configuration
 */
function getEmailTemplate($template) {
    $templates = [
        'contact_confirmation' => [
            'subject' => 'Thank you for contacting Gisu Safaris - {{destination}} Inquiry',
            'html' => getContactConfirmationHtml(),
            'text' => getContactConfirmationText()
        ],
        'booking_confirmation' => [
            'subject' => 'Safari Booking Received - {{package_name}} - Booking #{{booking_id}}',
            'html' => getBookingConfirmationHtml(),
            'text' => getBookingConfirmationText()
        ],
        'enquiry_confirmation' => [
            'subject' => 'Enquiry Received - {{subject}} - Reference #{{enquiry_id}}',
            'html' => getEnquiryConfirmationHtml(),
            'text' => getEnquiryConfirmationText()
        ],
        'quote_confirmation' => [
            'subject' => 'Quote Request Received - {{destination}} Safari - Quote #{{quote_id}}',
            'html' => getQuoteConfirmationHtml(),
            'text' => getQuoteConfirmationText()
        ]
    ];
    
    return isset($templates[$template]) ? $templates[$template] : null;
}

/**
 * Contact confirmation email HTML template
 */
function getContactConfirmationHtml() {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Thank You - Gisu Safaris</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c5530;">Gisu Safaris</h1>
                <p style="color: #666; margin: 0;">Leading Sustainable Safari Experiences</p>
            </div>
            
            <h2 style="color: #2c5530;">Thank You for Your Interest!</h2>
            
            <p>Dear {{first_name}},</p>
            
            <p>Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience. We have received your inquiry and our safari specialists are excited to help you plan an unforgettable adventure.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">Your Inquiry Details:</h3>
                <p><strong>Destination:</strong> {{destination}}</p>
                <p><strong>Group Size:</strong> {{group_size}} travelers</p>
                <p><strong>Preferred Travel Date:</strong> {{travel_date}}</p>
            </div>
            
            <h3 style="color: #2c5530;">What Happens Next?</h3>
            <ul>
                <li>Our safari specialists will review your requirements</li>
                <li>We will contact you within 24 hours to discuss your preferences</li>
                <li>We will prepare a customized itinerary based on your interests</li>
                <li>You will receive a detailed proposal with pricing</li>
            </ul>
            
            <p>At Gisu Safaris, we are committed to providing sustainable safari experiences that benefit local communities and wildlife conservation. Your adventure will not only create lifelong memories but also contribute to preserving East Africa\'s incredible natural heritage.</p>
            
            <div style="background-color: #2c5530; color: white; padding: 20px; text-align: center; margin: 30px 0;">
                <h3 style="margin-top: 0;">Need Immediate Assistance?</h3>
                <p style="margin: 10px 0;">Call us: +256 780 950 555</p>
                <p style="margin: 10px 0;">Email: info@gisusafaris.com</p>
            </div>
            
            <p>We look forward to crafting your perfect safari experience!</p>
            
            <p>Best regards,<br>
            The Gisu Safaris Team<br>
            <em>Conservation • Community • Adventure</em></p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666;">
                    &copy; {{current_year}} Gisu Safaris. All rights reserved.<br>
                    Visit us at <a href="{{site_url}}" style="color: #2c5530;">{{site_url}}</a>
                </p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Contact confirmation email text template
 */
function getContactConfirmationText() {
    return '
Dear {{first_name}},

Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience. We have received your inquiry and our safari specialists are excited to help you plan an unforgettable adventure.

Your Inquiry Details:
- Destination: {{destination}}
- Group Size: {{group_size}} travelers
- Preferred Travel Date: {{travel_date}}

What Happens Next?
- Our safari specialists will review your requirements
- We will contact you within 24 hours to discuss your preferences
- We will prepare a customized itinerary based on your interests
- You will receive a detailed proposal with pricing

At Gisu Safaris, we are committed to providing sustainable safari experiences that benefit local communities and wildlife conservation.

Need Immediate Assistance?
Call us: +256 780 950 555
Email: info@gisusafaris.com

We look forward to crafting your perfect safari experience!

Best regards,
The Gisu Safaris Team
Conservation • Community • Adventure

© {{current_year}} Gisu Safaris. All rights reserved.
Visit us at {{site_url}}
    ';
}

/**
 * Booking confirmation email HTML template
 */
function getBookingConfirmationHtml() {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Booking Confirmation - Gisu Safaris</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c5530;">Gisu Safaris</h1>
                <p style="color: #666; margin: 0;">Your Safari Adventure Awaits!</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c5530; margin-top: 0;">Booking Confirmation</h2>
                <p style="font-size: 18px; margin-bottom: 0;"><strong>Booking ID: #{{booking_id}}</strong></p>
            </div>
            
            <p>Dear {{first_name}},</p>
            
            <p>Congratulations! Your safari booking has been successfully received. We are thrilled to be part of your upcoming adventure and look forward to providing you with an exceptional experience.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">Your Safari Details:</h3>
                <p><strong>Package:</strong> {{package_name}}</p>
                <p><strong>Duration:</strong> {{duration}}</p>
                <p><strong>Group Size:</strong> {{group_size}} travelers</p>
                <p><strong>Travel Date:</strong> {{travel_date}}</p>
            </div>
            
            <h3 style="color: #2c5530;">Next Steps:</h3>
            <ol>
                <li><strong>Confirmation Call:</strong> Our team will contact you within 24 hours to confirm details</li>
                <li><strong>Itinerary Planning:</strong> We will finalize your detailed itinerary based on your preferences</li>
                <li><strong>Payment Instructions:</strong> You will receive payment details and options</li>
                <li><strong>Pre-Safari Briefing:</strong> We will provide essential information about your safari</li>
            </ol>
            
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0;"><strong>Important:</strong> Please keep this booking reference number safe. You will need it for all future communications regarding your safari.</p>
            </div>
            
            <h3 style="color: #2c5530;">Contact Information</h3>
            <p>If you have any questions or need to make changes to your booking:</p>
            <ul>
                <li><strong>Phone:</strong> +256 780 950 555</li>
                <li><strong>Email:</strong> bookings@gisusafaris.com</li>
                <li><strong>Reference your Booking ID:</strong> #{{booking_id}}</li>
            </ul>
            
            <p>Thank you for choosing Gisu Safaris. We cannot wait to share the wonders of East Africa with you while contributing to wildlife conservation and community development.</p>
            
            <p>Best regards,<br>
            The Gisu Safaris Booking Team<br>
            <em>Conservation • Community • Adventure</em></p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666;">
                    &copy; {{current_year}} Gisu Safaris. All rights reserved.<br>
                    Visit us at <a href="{{site_url}}" style="color: #2c5530;">{{site_url}}</a>
                </p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Booking confirmation email text template
 */
function getBookingConfirmationText() {
    return '
BOOKING CONFIRMATION - Gisu Safaris
Booking ID: #{{booking_id}}

Dear {{first_name}},

Congratulations! Your safari booking has been successfully received. We are thrilled to be part of your upcoming adventure.

Your Safari Details:
- Package: {{package_name}}
- Duration: {{duration}}
- Group Size: {{group_size}} travelers
- Travel Date: {{travel_date}}

Next Steps:
1. Confirmation Call: Our team will contact you within 24 hours
2. Itinerary Planning: We will finalize your detailed itinerary
3. Payment Instructions: You will receive payment details and options
4. Pre-Safari Briefing: We will provide essential safari information

IMPORTANT: Please keep this booking reference number safe. You will need it for all future communications.

Contact Information:
Phone: +256 780 950 555
Email: bookings@gisusafaris.com
Reference your Booking ID: #{{booking_id}}

Thank you for choosing Gisu Safaris!

Best regards,
The Gisu Safaris Booking Team
Conservation • Community • Adventure

© {{current_year}} Gisu Safaris. All rights reserved.
Visit us at {{site_url}}
    ';
}

/**
 * Enquiry confirmation email HTML template
 */
function getEnquiryConfirmationHtml() {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Enquiry Received - Gisu Safaris</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c5530;">Gisu Safaris</h1>
                <p style="color: #666; margin: 0;">Thank you for reaching out</p>
            </div>
            
            <h2 style="color: #2c5530;">Enquiry Received</h2>
            
            <p>Dear {{first_name}},</p>
            
            <p>Thank you for your enquiry regarding "{{subject}}". We have received your message and our team is reviewing your request.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">Enquiry Reference:</h3>
                <p><strong>Reference Number:</strong> #{{enquiry_id}}</p>
                <p><strong>Subject:</strong> {{subject}}</p>
                <p><strong>Type:</strong> {{enquiry_type}}</p>
            </div>
            
            <p><strong>Response Time:</strong> We aim to respond to all enquiries within 24 hours during business hours.</p>
            
            <div style="background-color: #2c5530; color: white; padding: 20px; text-align: center; margin: 30px 0;">
                <h3 style="margin-top: 0;">Need Urgent Assistance?</h3>
                <p style="margin: 10px 0;">Call us: +256 780 950 555</p>
                <p style="margin: 10px 0;">Email: info@gisusafaris.com</p>
            </div>
            
            <p>Thank you for your interest in Gisu Safaris. We look forward to assisting you!</p>
            
            <p>Best regards,<br>
            The Gisu Safaris Team</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666;">
                    &copy; {{current_year}} Gisu Safaris. All rights reserved.<br>
                    Visit us at <a href="{{site_url}}" style="color: #2c5530;">{{site_url}}</a>
                </p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Enquiry confirmation email text template
 */
function getEnquiryConfirmationText() {
    return '
Dear {{first_name}},

Thank you for your enquiry regarding "{{subject}}". We have received your message and our team is reviewing your request.

Enquiry Reference:
- Reference Number: #{{enquiry_id}}
- Subject: {{subject}}
- Type: {{enquiry_type}}

Response Time: We aim to respond to all enquiries within 24 hours during business hours.

Need Urgent Assistance?
Call us: +256 780 950 555
Email: info@gisusafaris.com

Thank you for your interest in Gisu Safaris!

Best regards,
The Gisu Safaris Team

© {{current_year}} Gisu Safaris. All rights reserved.
Visit us at {{site_url}}
    ';
}

/**
 * Quote confirmation email HTML template
 */
function getQuoteConfirmationHtml() {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Quote Request Received - Gisu Safaris</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c5530;">Gisu Safaris</h1>
                <p style="color: #666; margin: 0;">Custom Safari Quote Request</p>
            </div>
            
            <h2 style="color: #2c5530;">Quote Request Received</h2>
            
            <p>Dear {{first_name}},</p>
            
            <p>Thank you for requesting a custom quote for your {{destination}} safari experience. Our safari specialists are now working on creating a personalized itinerary just for you.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">Quote Request Details:</h3>
                <p><strong>Quote ID:</strong> #{{quote_id}}</p>
                <p><strong>Destination:</strong> {{destination}}</p>
                <p><strong>Group Size:</strong> {{group_size}} travelers</p>
                <p><strong>Travel Date:</strong> {{travel_date}}</p>
            </div>
            
            <h3 style="color: #2c5530;">What Happens Next?</h3>
            <ol>
                <li><strong>Requirements Review:</strong> Our specialists will analyze your detailed requirements</li>
                <li><strong>Itinerary Creation:</strong> We will design a customized safari experience</li>
                <li><strong>Quote Preparation:</strong> A detailed quote with pricing will be prepared</li>
                <li><strong>Quote Delivery:</strong> You will receive your personalized quote within 48 hours</li>
                <li><strong>Consultation:</strong> We will schedule a call to discuss and refine your safari</li>
            </ol>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                <p style="margin: 0;"><strong>Estimated Delivery:</strong> Your custom quote will be ready within 48 hours. We will email it directly to you along with detailed information about your proposed safari experience.</p>
            </div>
            
            <h3 style="color: #2c5530;">Contact Information</h3>
            <p>If you have any questions or need to provide additional information:</p>
            <ul>
                <li><strong>Phone:</strong> +256 780 950 555</li>
                <li><strong>Email:</strong> quotes@gisusafaris.com</li>
                <li><strong>Reference your Quote ID:</strong> #{{quote_id}}</li>
            </ul>
            
            <p>We are excited to help you create an unforgettable safari experience that contributes to wildlife conservation and community development in East Africa.</p>
            
            <p>Best regards,<br>
            The Gisu Safaris Quote Team<br>
            <em>Conservation • Community • Adventure</em></p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666;">
                    &copy; {{current_year}} Gisu Safaris. All rights reserved.<br>
                    Visit us at <a href="{{site_url}}" style="color: #2c5530;">{{site_url}}</a>
                </p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Quote confirmation email text template
 */
function getQuoteConfirmationText() {
    return '
QUOTE REQUEST RECEIVED - Gisu Safaris
Quote ID: #{{quote_id}}

Dear {{first_name}},

Thank you for requesting a custom quote for your {{destination}} safari experience. Our safari specialists are now working on creating a personalized itinerary just for you.

Quote Request Details:
- Quote ID: #{{quote_id}}
- Destination: {{destination}}
- Group Size: {{group_size}} travelers
- Travel Date: {{travel_date}}

What Happens Next?
1. Requirements Review: Our specialists will analyze your detailed requirements
2. Itinerary Creation: We will design a customized safari experience
3. Quote Preparation: A detailed quote with pricing will be prepared
4. Quote Delivery: You will receive your personalized quote within 48 hours
5. Consultation: We will schedule a call to discuss and refine your safari

Estimated Delivery: Your custom quote will be ready within 48 hours.

Contact Information:
Phone: +256 780 950 555
Email: quotes@gisusafaris.com
Reference your Quote ID: #{{quote_id}}

We are excited to help you create an unforgettable safari experience!

Best regards,
The Gisu Safaris Quote Team
Conservation • Community • Adventure

© {{current_year}} Gisu Safaris. All rights reserved.
Visit us at {{site_url}}
    ';
}

/**
 * Generate welcome email for newsletter subscribers
 */
function generateWelcomeEmail($email) {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to Gisu Safaris Newsletter</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c5530;">Welcome to Gisu Safaris!</h1>
                <p style="color: #666; margin: 0;">Your Safari Adventure Journey Begins</p>
            </div>
            
            <h2 style="color: #2c5530;">Thank You for Subscribing!</h2>
            
            <p>Dear Safari Enthusiast,</p>
            
            <p>Welcome to the Gisu Safaris family! We are thrilled to have you join our community of adventure seekers and conservation champions.</p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">What to Expect:</h3>
                <ul style="margin-bottom: 0;">
                    <li>🌍 <strong>Exclusive Safari Deals:</strong> Be the first to know about special packages</li>
                    <li>🦁 <strong>Wildlife Updates:</strong> Latest conservation news and wildlife stories</li>
                    <li>📸 <strong>Travel Tips:</strong> Expert advice for your East African adventure</li>
                    <li>🏕️ <strong>Behind the Scenes:</strong> Stories from our safari guides and conservationists</li>
                    <li>🎁 <strong>Subscriber Perks:</strong> Exclusive discounts and early access to new packages</li>
                </ul>
            </div>
            
            <div style="background-color: #2c5530; color: white; padding: 20px; text-align: center; margin: 30px 0;">
                <h3 style="margin-top: 0;">Ready to Start Planning?</h3>
                <p style="margin-bottom: 20px;">Explore our most popular safari destinations:</p>
                <p style="margin: 5px 0;">🇺🇬 <strong>Uganda:</strong> Gorilla Trekking & Wildlife Safaris</p>
                <p style="margin: 5px 0;">🇷🇼 <strong>Rwanda:</strong> Mountain Gorillas & Cultural Experiences</p>
                <p style="margin: 5px 0;">🇰🇪 <strong>Kenya:</strong> Masai Mara & Coastal Adventures</p>
                <p style="margin: 5px 0;">🇹🇿 <strong>Tanzania:</strong> Serengeti & Ngorongoro Crater</p>
            </div>
            
            <p>At Gisu Safaris, every adventure contributes to wildlife conservation and community development. When you travel with us, you are not just creating memories – you are making a positive impact on East Africa\'s incredible ecosystems and local communities.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Questions? We\'re here to help!</strong></p>
                <p>📞 +256 780 950 555 | ✉️ info@gisusafaris.com</p>
            </div>
            
            <p>Thank you for choosing to be part of our mission. We look forward to sharing amazing safari experiences with you!</p>
            
            <p>Best regards,<br>
            The Gisu Safaris Team<br>
            <em>Conservation • Community • Adventure</em></p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>You are receiving this email because you subscribed to our newsletter.</p>
                <p>&copy; ' . date('Y') . ' Gisu Safaris. All rights reserved.</p>
                <p>Visit us at <a href="' . FRONTEND_URL . '" style="color: #2c5530;">' . FRONTEND_URL . '</a></p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Generate admin notification email for contact submissions
 */
function generateAdminNotificationEmail($data, $contact_id) {
    $travel_date = $data['travel_date'] ?: 'Not specified';
    $phone = $data['phone'] ?: 'Not provided';
    $duration = $data['duration'] ?: 'Not specified';
    $budget = $data['budget'] ?: 'Not specified';
    
    $interests_list = '';
    if (!empty($data['interests'])) {
        $interests_list = '<p><strong>Interests:</strong> ' . implode(', ', $data['interests']) . '</p>';
    }
    
    return "
        <h2>New Safari Contact Form Submission</h2>
        <p><strong>Contact ID:</strong> #{$contact_id}</p>
        <hr>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> {$data['first_name']} {$data['last_name']}</p>
        <p><strong>Email:</strong> <a href=\"mailto:{$data['email']}\">{$data['email']}</a></p>
        <p><strong>Phone:</strong> {$phone}</p>
        <p><strong>Country:</strong> {$data['country']}</p>
        
        <h3>Safari Inquiry Details</h3>
        <p><strong>Destination:</strong> {$data['destination']}</p>
        <p><strong>Duration:</strong> {$duration}</p>
        <p><strong>Group Size:</strong> {$data['group_size']} people</p>
        <p><strong>Travel Date:</strong> {$travel_date}</p>
        <p><strong>Budget:</strong> {$budget}</p>
        
        {$interests_list}
        
        " . (!empty($data['message']) ? "<h3>Message</h3><p>" . nl2br(htmlspecialchars($data['message'])) . "</p>" : "") . "
        
        <h3>System Information</h3>
        <p><strong>Newsletter Subscription:</strong> " . ($data['newsletter_opt_in'] ? 'Yes' : 'No') . "</p>
        <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        <p><strong>IP Address:</strong> " . getClientIp() . "</p>
        
        <hr>
        <p><em>Please follow up with this customer within 24 hours.</em></p>
    ";
}
?>
