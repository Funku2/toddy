<?php
// Email sign-up handler for Hostinger (or any PHP host).
// Saves each sign-up to a CSV file kept OUTSIDE the public website folder,
// so it cannot be downloaded by visitors:  ../tbe-private/subscribers.csv
// Open it from Hostinger's File Manager, one level above public_html.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /start/', true, 303);
    exit;
}

// Honeypot: real visitors never fill this in.
if (!empty($_POST['company'])) {
    header('Location: /thanks/', true, 303);
    exit;
}

$email = strtolower(trim((string)($_POST['email'] ?? '')));
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit('That email address does not look right. Please go back and try again.');
}
$source = preg_replace('/[^a-z0-9\-]/i', '', substr((string)($_POST['source'] ?? ''), 0, 60));

$dir = dirname(__DIR__) . '/tbe-private';
$saved = false;
if (is_dir($dir) || @mkdir($dir, 0700, true)) {
    $fh = @fopen($dir . '/subscribers.csv', 'a');
    if ($fh) {
        if (flock($fh, LOCK_EX)) {
            if (fstat($fh)['size'] === 0) {
                fputcsv($fh, ['signed_up_utc', 'email', 'source']);
            }
            $saved = fputcsv($fh, [gmdate('Y-m-d H:i:s'), $email, $source]) !== false;
            flock($fh, LOCK_UN);
        }
        fclose($fh);
    }
}

if (!$saved) {
    http_response_code(500);
    exit('Sorry, we could not save your sign-up. Please email hello@thebiologicaledge.com and we will send the guide.');
}

header('Location: /thanks/', true, 303);
