-- Gisu Safaris Backend Setup (MySQL seed data)
--
-- Usage:
-- 1. Run backend/database/schema.mysql.sql first to create all tables.
-- 2. Then run/import this file once in the same MySQL database
--    (default: `gisusafaris_fraco`) to insert initial data.
--
-- It is safe to run this file multiple times; INSERT IGNORE is used
-- where appropriate to avoid duplicate key errors.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Insert default admin account for backend/api/auth.php
-- Password is "admin123" (bcrypt hash copied from original PostgreSQL setup.sql)
INSERT IGNORE INTO admins (email, password_hash)
VALUES (
    'admin@gisusafaris.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);

-- Optional: seed basic email templates in a future email_templates table.
-- The current code uses templates defined in backend/includes/email.php,
-- so this section is only provided as a reference example.
--
-- Example structure (uncomment and adjust once an email_templates table
-- exists in your MySQL schema):
--
-- INSERT IGNORE INTO email_templates (name, subject, html_content, text_content)
-- VALUES
--   (
--     'contact_confirmation',
--     'Thank you for contacting Gisu Safaris - {{destination}} Inquiry',
--     '<h2>Thank You for Your Interest!</h2><p>Dear {{first_name}},</p><p>Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience.</p>',
--     'Dear {{first_name}}, Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience.'
--   ),
--   (
--     'booking_confirmation',
--     'Safari Booking Received - {{package_name}} - Booking #{{booking_id}}',
--     '<h2>Booking Confirmation</h2><p>Dear {{first_name}},</p><p>Your safari booking for {{package_name}} has been received!</p>',
--     'Dear {{first_name}}, Your safari booking for {{package_name}} has been received!'
--   ),
--   (
--     'enquiry_confirmation',
--     'Enquiry Received - {{subject}} - Reference #{{enquiry_id}}',
--     '<h2>Enquiry Received</h2><p>Dear {{first_name}},</p><p>Thank you for your enquiry regarding "{{subject}}".</p>',
--     'Dear {{first_name}}, Thank you for your enquiry regarding "{{subject}}".'
--   );
--
-- End of setup.mysql.sql
