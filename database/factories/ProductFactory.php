<?php

namespace Database\Factories;

use App\Models\Category;
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
            'category_id' => Category::factory(),
            'sku' => fake()->unique()->bothify('SKU-####??'),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'original_price' => fake()->randomFloat(2, 5, 500),
            'is_active' => true,
        ];
    }
}
