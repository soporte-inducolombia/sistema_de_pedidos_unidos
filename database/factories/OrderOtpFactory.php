<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderOtp;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<OrderOtp>
 */
class OrderOtpFactory extends Factory
{
    protected $model = OrderOtp::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'verified_at' => null,
            'attempts' => 0,
            'max_attempts' => 5,
            'resend_count' => 0,
            'last_sent_at' => now(),
        ];
    }
}
