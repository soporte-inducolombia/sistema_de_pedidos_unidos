<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Validate the default seeded user is the expected admin account.
     */
    public function test_database_seeder_creates_admin_support_user(): void
    {
        $this->seed();

        $user = User::query()->where('username', 'soporte_inducolombia')->first();

        $this->assertNotNull($user);
        $this->assertSame('Test User', $user->name);
        $this->assertSame('admin', $user->role);
    }
}
