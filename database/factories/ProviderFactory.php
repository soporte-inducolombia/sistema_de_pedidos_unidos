<?php

namespace Database\Factories;

use App\Models\Provider;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Provider>
 */
class ProviderFactory extends Factory
{
    protected $model = Provider::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'company_name' => fake()->company(),
            'tax_id' => fake()->unique()->numerify('##########'),
            'stand_label' => 'Stand '.fake()->numberBetween(1, 99),
            'contact_phone' => fake()->phoneNumber(),
            'is_active' => true,
        ];
    }
}
