<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Provider;
use App\Models\User;
use Database\Seeders\NormalizeProviderCredentialsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NormalizeProviderCredentialsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_abbreviates_provider_username_and_sets_temporary_password(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::PROVIDER->value,
            'username' => 'nombre_largo_actual',
            'password' => Hash::make('password-previo'),
        ]);

        Provider::factory()->create([
            'user_id' => $user->id,
            'company_name' => 'ABSORBENTES DE COLOMBIA SA',
        ]);

        $this->seed(NormalizeProviderCredentialsSeeder::class);

        $user->refresh();

        $this->assertSame('adcsa', $user->username);
        $this->assertTrue(Hash::check('1234', $user->password));
    }

    public function test_it_keeps_usernames_unique_when_abbreviation_collides(): void
    {
        $firstUser = User::factory()->create([
            'role' => UserRole::PROVIDER->value,
        ]);

        Provider::factory()->create([
            'user_id' => $firstUser->id,
            'company_name' => 'A B C SA',
        ]);

        $secondUser = User::factory()->create([
            'role' => UserRole::PROVIDER->value,
        ]);

        Provider::factory()->create([
            'user_id' => $secondUser->id,
            'company_name' => 'A.B.C. SA',
        ]);

        $this->seed(NormalizeProviderCredentialsSeeder::class);

        $firstUser->refresh();
        $secondUser->refresh();

        $this->assertNotSame($firstUser->username, $secondUser->username);
        $this->assertStringStartsWith('abcsa', $firstUser->username);
        $this->assertStringStartsWith('abcsa', $secondUser->username);
    }
}
