<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProviderProductManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure admins can access provider-product assignments.
     */
    public function test_admin_can_view_provider_product_management_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $assignment = ProviderProduct::factory()->create();

        $response = $this->actingAs($admin)->get(route('admin.provider-products.index'));

        $response->assertOk();
        $response->assertSee((string) $assignment->provider?->company_name);
    }

    public function test_non_admin_users_cannot_access_provider_product_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.provider-products.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_provider_product_assignment(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $provider = Provider::factory()->create();
        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        $storeResponse = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_type' => 'percent',
            'discount_value' => '20',
            'is_active' => true,
        ]);

        $storeResponse->assertRedirect(route('admin.provider-products.index'));

        $assignment = ProviderProduct::query()->where('provider_id', $provider->id)->where('product_id', $product->id)->firstOrFail();

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'special_price' => 80,
        ]);

        $updateResponse = $this->actingAs($admin)->patch(route('admin.provider-products.update', $assignment), [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_type' => 'fixed',
            'discount_value' => '15',
            'is_active' => false,
        ]);

        $updateResponse->assertRedirect(route('admin.provider-products.index'));

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'discount_type' => 'fixed',
            'special_price' => 85,
            'is_active' => false,
        ]);

        $deleteResponse = $this->actingAs($admin)->delete(route('admin.provider-products.destroy', $assignment));
        $deleteResponse->assertRedirect(route('admin.provider-products.index'));

        $this->assertDatabaseMissing('provider_products', [
            'id' => $assignment->id,
        ]);
    }

    public function test_admin_cannot_create_assignment_with_invalid_discount_value(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $provider = Provider::factory()->create();
        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_type' => 'percent',
            'discount_value' => '150',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('discount_value');

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
        ]);
    }
}
