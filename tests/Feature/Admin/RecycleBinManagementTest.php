<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RecycleBinManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure recycle bin is only available to admins.
     */
    public function test_admin_can_view_recycle_bin_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.recycle-bin.index'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/recycle-bin/index')
                ->has('items'));
    }

    public function test_non_admin_cannot_access_recycle_bin_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.recycle-bin.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_restore_deleted_product_from_recycle_bin(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $product = Product::factory()->create();

        $this->actingAs($admin)->delete(route('admin.products.destroy', $product));

        $this->assertSoftDeleted('products', [
            'id' => $product->id,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.recycle-bin.restore', [
            'entity' => 'products',
            'id' => $product->id,
        ]));

        $response->assertRedirect(route('admin.recycle-bin.index'));

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'deleted_at' => null,
        ]);
    }

    public function test_admin_can_restore_deleted_user_with_provider_and_assignments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'provider',
        ]);

        $provider = Provider::factory()->create([
            'user_id' => $targetUser->id,
        ]);

        $product = Product::factory()->create();

        $assignment = ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
        ]);

        $this->actingAs($admin)->delete(route('admin.users.destroy', $targetUser));

        $this->assertSoftDeleted('users', [
            'id' => $targetUser->id,
        ]);

        $this->assertSoftDeleted('providers', [
            'id' => $provider->id,
        ]);

        $this->assertSoftDeleted('provider_products', [
            'id' => $assignment->id,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.recycle-bin.restore', [
            'entity' => 'users',
            'id' => $targetUser->id,
        ]));

        $response->assertRedirect(route('admin.recycle-bin.index'));

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'deleted_at' => null,
        ]);

        $this->assertDatabaseHas('providers', [
            'id' => $provider->id,
            'deleted_at' => null,
        ]);

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'deleted_at' => null,
        ]);
    }
}
