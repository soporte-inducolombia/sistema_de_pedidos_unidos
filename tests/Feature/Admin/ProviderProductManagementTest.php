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
            'original_price' => '100',
            'discount_value' => '20',
            'is_active' => true,
        ]);

        $storeResponse->assertStatus(302);
        $storeResponse->assertSessionHasNoErrors();

        $assignment = ProviderProduct::query()->where('provider_id', $provider->id)->where('product_id', $product->id)->firstOrFail();

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'special_price' => 80,
        ]);

        $updateResponse = $this->actingAs($admin)->patch(route('admin.provider-products.update', $assignment), [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'original_price' => '120',
            'discount_value' => '25',
            'is_active' => false,
        ]);

        $updateResponse->assertRedirect(route('admin.provider-products.index'));

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'discount_type' => 'percent',
            'special_price' => 90,
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'original_price' => 120,
        ]);

        $deleteResponse = $this->actingAs($admin)->delete(route('admin.provider-products.destroy', $assignment));
        $deleteResponse->assertRedirect(route('admin.provider-products.index'));

        $this->assertSoftDeleted('provider_products', [
            'id' => $assignment->id,
        ]);
    }

    public function test_admin_can_recreate_deleted_provider_product_assignment_without_unique_conflict(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $provider = Provider::factory()->create();
        $product = Product::factory()->create([
            'original_price' => 200,
        ]);

        $assignment = ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_value' => 10,
            'special_price' => 180,
        ]);

        $this->actingAs($admin)->delete(route('admin.provider-products.destroy', $assignment));

        $storeResponse = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'original_price' => '200',
            'discount_value' => '25',
            'is_active' => true,
        ]);

        $storeResponse->assertStatus(302);
        $storeResponse->assertSessionHasNoErrors();

        $this->assertDatabaseHas('provider_products', [
            'id' => $assignment->id,
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_value' => 25,
            'special_price' => 150,
            'deleted_at' => null,
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
            'original_price' => '100',
            'discount_value' => '150',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('discount_value');

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
        ]);
    }

    public function test_admin_can_create_assignment_with_special_price_and_derive_discount_percent(): void
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
            'original_price' => '100',
            'special_price' => '70',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('admin.provider-products.index'));

        $this->assertDatabaseHas('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_type' => 'percent',
            'discount_value' => 30,
            'special_price' => 70,
        ]);
    }

    public function test_admin_can_create_multiple_assignments_in_single_request(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $provider = Provider::factory()->create();
        $firstProduct = Product::factory()->create([
            'original_price' => 100,
        ]);
        $secondProduct = Product::factory()->create([
            'original_price' => 250,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $provider->id,
            'product_ids' => [$firstProduct->id, $secondProduct->id],
            'discount_value' => '20',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('admin.provider-products.index'));
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $firstProduct->id,
            'discount_type' => 'percent',
            'discount_value' => 20,
            'special_price' => 80,
        ]);

        $this->assertDatabaseHas('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $secondProduct->id,
            'discount_type' => 'percent',
            'discount_value' => 20,
            'special_price' => 200,
        ]);
    }

    public function test_admin_cannot_use_special_price_for_multiple_assignments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $provider = Provider::factory()->create();
        $firstProduct = Product::factory()->create([
            'original_price' => 100,
        ]);
        $secondProduct = Product::factory()->create([
            'original_price' => 120,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $provider->id,
            'product_ids' => [$firstProduct->id, $secondProduct->id],
            'special_price' => '90',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('special_price');

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $firstProduct->id,
        ]);

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $secondProduct->id,
        ]);
    }

    public function test_admin_cannot_create_assignment_when_special_price_is_higher_than_original(): void
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
            'original_price' => '100',
            'special_price' => '150',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('special_price');

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $product->id,
        ]);
    }
}
