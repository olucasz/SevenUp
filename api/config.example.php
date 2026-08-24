<?php
/**
 * Copy this file to api/config.local.php on the server only.
 * Never commit api/config.local.php with real SMTP credentials.
 */
return [
    'SMTP_HOST' => 'smtp.gmail.com',
    'SMTP_PORT' => '587',
    'SMTP_SECURE' => 'tls',
    'SMTP_USER' => 'sitesevenup@gmail.com',
    'SMTP_PASS' => 'COLOCAR_GOOGLE_APP_PASSWORD_AQUI_NO_SERVIDOR',
    'SMTP_FROM' => 'sitesevenup@gmail.com',
    'SMTP_FROM_NAME' => 'Clínica SevenUp',
    'SMTP_TO' => 'clinicasevenup@gmail.com',
];
