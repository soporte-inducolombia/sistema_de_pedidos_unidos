<?php

namespace Database\Factories;

use App\Enums\DiscountType;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProviderProduct>
 */
class ProviderProductFactory extends Factory
{
    protected $model = ProviderProduct::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $original = fake()->randomFloat(2, 5, 500);
        $discount = fake()->numberBetween(5, 30);
        $special = round($original * ((100 - $discount) / 100), 2);

        return [
            'provider_id' => Provider::factory(),
            'product_id' => Product::factory(),
            'discount_type' => DiscountType::PERCENT,
            'discount_value' => $discount,
            'special_price' => $special,
            'is_active' => true,
        ];
    }
}
