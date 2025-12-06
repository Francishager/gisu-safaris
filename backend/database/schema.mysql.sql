-- Gisu Safaris Backend Schema (MySQL)
-- This file defines the core MySQL tables used by the PHP backend.
--
-- Usage:
-- 1. Log into your MySQL server (e.g. cPanel phpMyAdmin).
-- 2. Select the database you configured in backend/config/.env (default: `gisusafaris_fraco`).
-- 3. Run/import this file once to create the tables.
--
-- This is a MySQL-oriented equivalent of backend/database/schema.sql.
-- It covers the tables actually used by the current PHP code. Postgres-only
-- analytics functions, views, and pgvector/RAG tables are intentionally
-- omitted.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Admins table (used by backend/api/auth.php)
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- System logs (used by config.php::logEvent and rate limiting)
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    ip_address VARCHAR(45),
    user_id BIGINT UNSIGNED NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_system_logs_level (log_level),
    KEY idx_system_logs_created_at (created_at),
    KEY idx_system_logs_ip (ip_address),
    KEY idx_system_logs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact form submissions (contact.php)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    group_size VARCHAR(20) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    budget VARCHAR(50),
    travel_date DATE,
    interests TEXT,
    message TEXT,
    newsletter_opt_in TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'new',
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    nationality VARCHAR(100),
    passport VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_contact_email (email),
    KEY idx_contact_created_at (created_at),
    KEY idx_contact_status (status),
    KEY idx_contact_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Safari bookings (booking.php)
CREATE TABLE IF NOT EXISTS safari_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    package_type VARCHAR(100) DEFAULT 'uganda-safari',
    duration VARCHAR(50),
    group_size VARCHAR(20) NOT NULL,
    travel_date DATE,
    budget VARCHAR(50),
    accommodation_level VARCHAR(50),
    special_requirements TEXT,
    message TEXT,
    newsletter_opt_in TINYINT(1) DEFAULT 0,
    booking_status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    nationality VARCHAR(100),
    passport VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_safari_email (email),
    KEY idx_safari_created_at (created_at),
    KEY idx_safari_status (booking_status),
    KEY idx_safari_package (package_name),
    KEY idx_safari_travel_date (travel_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- General enquiries (enquiry.php)
CREATE TABLE IF NOT EXISTS general_enquiries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    enquiry_type VARCHAR(50) DEFAULT 'general',
    message TEXT NOT NULL,
    newsletter_opt_in TINYINT(1) DEFAULT 0,
    referrer_page VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new',
    assigned_to BIGINT UNSIGNED,
    response_sent TINYINT(1) DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_enquiries_email (email),
    KEY idx_enquiries_created_at (created_at),
    KEY idx_enquiries_status (status),
    KEY idx_enquiries_type (enquiry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quote requests (quote.php)
CREATE TABLE IF NOT EXISTS quote_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    group_size VARCHAR(20) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    budget_range VARCHAR(50),
    travel_date DATE,
    accommodation_level VARCHAR(50),
    activities TEXT,
    special_interests TEXT,
    dietary_requirements TEXT,
    mobility_requirements TEXT,
    additional_requirements TEXT,
    message TEXT,
    newsletter_opt_in TINYINT(1) DEFAULT 0,
    quote_status VARCHAR(20) DEFAULT 'pending',
    quote_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    quote_sent TINYINT(1) DEFAULT 0,
    quote_sent_at DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_quotes_email (email),
    KEY idx_quotes_created_at (created_at),
    KEY idx_quotes_status (quote_status),
    KEY idx_quotes_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Multi-country bookings (multi-country.php)
CREATE TABLE IF NOT EXISTS multi_country_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    tour_combination VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    group_size VARCHAR(20) NOT NULL,
    travel_date DATE,
    budget_range VARCHAR(50),
    accommodation_level VARCHAR(50) DEFAULT 'mid-range',
    countries_included VARCHAR(255) NOT NULL,
    primary_interests TEXT,
    special_requirements TEXT,
    dietary_requirements TEXT,
    mobility_requirements TEXT,
    gorilla_permit_required TINYINT(1) DEFAULT 0,
    message TEXT,
    newsletter_opt_in TINYINT(1) DEFAULT 0,
    booking_status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    confirmed_at DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_multi_email (email),
    KEY idx_multi_booking_id (booking_id),
    KEY idx_multi_created_at (created_at),
    KEY idx_multi_status (booking_status),
    KEY idx_multi_combination (tour_combination),
    KEY idx_multi_travel_date (travel_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Newsletter subscriptions (newsletter.php + various APIs)
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    subscription_source VARCHAR(50) DEFAULT 'website',
    confirmed_at DATETIME,
    unsubscribed_at DATETIME,
    bounce_count INT DEFAULT 0,
    last_sent_at DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_newsletter_status (status),
    KEY idx_newsletter_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Car hire enquiries (car_hire.php)
CREATE TABLE IF NOT EXISTS car_hire_enquiries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100),
    subject VARCHAR(200) NOT NULL,
    enquiry_type VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50),
    rental_option VARCHAR(50),
    pickup_date DATE,
    return_date DATE,
    passengers VARCHAR(20),
    pickup_location VARCHAR(100),
    dropoff_location VARCHAR(100),
    license VARCHAR(100),
    notes TEXT,
    requirements TEXT,
    referrer_page TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_carhire_email (email),
    KEY idx_carhire_created_at (created_at),
    KEY idx_carhire_type (enquiry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stripe-ready package bookings (payments/* APIs)
CREATE TABLE IF NOT EXISTS package_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    package_type VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(100),
    travel_date DATE,
    group_size INT NOT NULL,
    accommodation_level VARCHAR(50),
    special_requests TEXT,
    add_ons TEXT,
    estimated_price DECIMAL(10,2),
    booking_status VARCHAR(20) DEFAULT 'inquiry',
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_amount DECIMAL(10,2),
    paid_at DATETIME,
    stripe_session_id VARCHAR(100),
    stripe_payment_intent_id VARCHAR(100),
    whatsapp_sent TINYINT(1) DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent TEXT,
    nationality VARCHAR(100),
    passport VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_package_stripe_session (stripe_session_id),
    KEY idx_package_email (email),
    KEY idx_package_type (package_type),
    KEY idx_package_created_at (created_at),
    KEY idx_package_booking_status (booking_status),
    KEY idx_package_travel_date (travel_date),
    KEY idx_package_payment_status (payment_status),
    KEY idx_package_stripe (stripe_session_id, stripe_payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments (generic Stripe payments table)
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED,
    booking_type VARCHAR(30),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    stripe_session_id VARCHAR(100) UNIQUE,
    stripe_payment_intent_id VARCHAR(100),
    receipt_url TEXT,
    customer_email VARCHAR(255),
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_payments_booking (booking_id),
    KEY idx_payments_status (status),
    KEY idx_payments_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blog posts (posts.php)
CREATE TABLE IF NOT EXISTS posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    content_html LONGTEXT NOT NULL,
    hero_image TEXT,
    status VARCHAR(20) DEFAULT 'published',
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_posts_status_pub (status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(100),
    ip VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_posts_audit_slug (slug),
    KEY idx_posts_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comments (comments.php, comments_moderate.php)
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    page_path TEXT NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    comment TEXT NOT NULL,
    consent TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_comments_page (page_path(255)),
    KEY idx_comments_status (status),
    KEY idx_comments_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat analytics (chat_transcript.php)
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(64) NOT NULL PRIMARY KEY,
    visitor_name VARCHAR(150),
    visitor_email VARCHAR(255),
    consent_transcript TINYINT(1) DEFAULT 0,
    marketing_consent TINYINT(1) DEFAULT 0,
    page TEXT,
    referrer TEXT,
    utm_source VARCHAR(120),
    utm_medium VARCHAR(120),
    utm_campaign VARCHAR(200),
    utm_term VARCHAR(200),
    utm_content VARCHAR(200),
    device TEXT,
    locale VARCHAR(20),
    tz_offset_minutes INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    started_at DATETIME,
    ended_at DATETIME,
    duration_seconds INT,
    messages_total INT,
    user_msgs INT,
    bot_msgs INT,
    lead_score INT,
    booking_intent TINYINT(1),
    package_interest VARCHAR(200),
    preferences TEXT,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_chat_sessions_started_at (started_at),
    KEY idx_chat_sessions_email (visitor_email),
    KEY idx_chat_sessions_booking_intent (booking_intent),
    KEY idx_chat_sessions_utm (utm_source, utm_medium, utm_campaign)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    sender VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    occurred_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_messages_session
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
        ON DELETE CASCADE,
    KEY idx_chat_messages_session (session_id),
    KEY idx_chat_messages_time (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vacancy applications (vacancies.php)
CREATE TABLE IF NOT EXISTS vacancy_applications (
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
    KEY idx_vacancy_email (email),
    KEY idx_vacancy_vacancy (vacancy_id),
    KEY idx_vacancy_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- End of schema.mysql.sql
