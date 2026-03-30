<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Provider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'public_id' => (string) Str::uuid(),
            'provider_id' => Provider::factory(),
            'customer_email' => fake()->safeEmail(),
            'status' => OrderStatus::PENDING,
            'subtotal_original' => 0,
            'subtotal_special' => 0,
            'total_discount' => 0,
            'confirmed_at' => null,
        ];
    }
}
