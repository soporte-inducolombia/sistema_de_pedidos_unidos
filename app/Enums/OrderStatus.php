<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case EXPIRED = 'expired';
    case CANCELLED = 'cancelled';
}
