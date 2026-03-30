<?php

namespace App\Services;

use App\Models\OrderOtp;
use Illuminate\Support\Facades\Hash;

class OrderOtpService
{
    public function generateCode(): string
    {
        $length = (int) config('orders.otp.length', 6);
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    public function hashCode(string $code): string
    {
        return Hash::make($code);
    }

    public function isValid(OrderOtp $otp, string $code): bool
    {
        return Hash::check($code, $otp->code_hash);
    }

    public function expiration(): \DateTimeInterface
    {
        $minutes = (int) config('orders.otp.ttl_minutes', 10);

        return now()->addMinutes($minutes);
    }

    public function canResend(OrderOtp $otp): bool
    {
        $maxResends = (int) config('orders.otp.max_resends', 3);

        if ($otp->resend_count >= $maxResends) {
            return false;
        }

        if ($otp->last_sent_at === null) {
            return true;
        }

        $cooldown = (int) config('orders.otp.resend_cooldown_seconds', 60);

        return $otp->last_sent_at->copy()->addSeconds($cooldown)->isPast();
    }
}
