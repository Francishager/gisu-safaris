<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Supabase\SupabaseClient;

$supabaseUrl = 'YOUR_SUPABASE_URL';
$supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // or service role key for admin operations

$supabase = new SupabaseClient($supabaseUrl, $supabaseKey);

// Function to get Supabase client
function getSupabase() {
    global $supabase;
    return $supabase;
}