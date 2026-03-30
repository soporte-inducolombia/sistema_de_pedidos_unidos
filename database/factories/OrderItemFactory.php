<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProviderProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 10);
        $original = fake()->randomFloat(2, 5, 500);
        $special = round($original * 0.9, 2);

        return [
            'order_id' => Order::factory(),
            'provider_product_id' => ProviderProduct::factory(),
            'product_id' => Product::factory(),
            'snapshot_product_name' => fake()->words(3, true),
            'snapshot_sku' => fake()->bothify('SKU-####??'),
            'snapshot_category_name' => fake()->word(),
            'unit_original_price' => $original,
            'unit_special_price' => $special,
            'quantity' => $quantity,
            'line_original_total' => round($original * $quantity, 2),
            'line_special_total' => round($special * $quantity, 2),
        ];
    }
}
