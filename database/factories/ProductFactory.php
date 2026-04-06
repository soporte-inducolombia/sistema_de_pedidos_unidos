<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('COD-####??'),
            'barcode' => fake()->unique()->numerify('###########'),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'original_price' => fake()->randomFloat(2, 5, 500),
            'is_active' => true,
        ];
    }
}
