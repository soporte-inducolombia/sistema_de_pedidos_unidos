<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_module_is_not_available_for_admins(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->actingAs($admin)->get('/admin/categories')->assertNotFound();
        $this->actingAs($admin)->post('/admin/categories', [
            'name' => 'Temporal',
            'slug' => 'temporal',
            'is_active' => true,
        ])->assertNotFound();
        $this->actingAs($admin)->patch('/admin/categories/1', [
            'name' => 'Temporal 2',
            'slug' => 'temporal-2',
            'is_active' => false,
        ])->assertNotFound();
        $this->actingAs($admin)->delete('/admin/categories/1')->assertNotFound();
    }

    public function test_categories_module_is_not_available_for_non_admin_users(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $this->actingAs($provider)->get('/admin/categories')->assertNotFound();
    }
}
