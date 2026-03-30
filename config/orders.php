<?php

return [
    'organizer_email' => env('ORDERS_ORGANIZER_EMAIL', 'compras2@unidos.com.co'),

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
];
