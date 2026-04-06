<?php

return [
    'organizer_email' => env('ORDERS_ORGANIZER_EMAIL', 'compras2@unidos.com.co'),

    'mail' => [
        'mailer' => env('ORDERS_MAILER', env('MAIL_MAILER', 'smtp')),
        'tries' => (int) env('ORDERS_MAIL_TRIES', 3),
        'timeout_seconds' => (int) env('ORDERS_MAIL_TIMEOUT_SECONDS', 30),
        'backoff_seconds' => [10, 30, 120],
    ],

    'otp' => [
        'length' => 6,
        'ttl_minutes' => 10,
        'max_attempts' => 5,
        'max_resends' => 3,
        'resend_cooldown_seconds' => 60,
    ],

    'queues' => [
        'otp' => env('ORDERS_QUEUE_OTP', 'mails'),
        'notifications' => env('ORDERS_QUEUE_NOTIFICATIONS', 'mails'),
        'exports' => env('ORDERS_QUEUE_EXPORTS', 'exports'),
    ],

    'signature' => [
        'max_bytes' => (int) env('ORDERS_SIGNATURE_MAX_BYTES', 512000),
    ],
];
