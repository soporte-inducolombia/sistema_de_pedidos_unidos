<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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

    public function test_provider_profiles_are_synced_from_provider_users_when_loading_assignments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $providerWithoutProfile = User::factory()->create([
            'role' => 'provider',
            'name' => 'Proveedor Nuevo',
        ]);

        $providerWithInactiveProfile = User::factory()->create([
            'role' => 'provider',
            'name' => 'Proveedor Inactivo',
        ]);

        Provider::factory()->create([
            'user_id' => $providerWithInactiveProfile->id,
            'is_active' => false,
        ]);

        $providerWithTrashedProfile = User::factory()->create([
            'role' => 'provider',
            'name' => 'Proveedor Archivado',
        ]);

        $trashedProvider = Provider::factory()->create([
            'user_id' => $providerWithTrashedProfile->id,
            'is_active' => false,
        ]);

        $trashedProvider->delete();

        $response = $this->actingAs($admin)->get(route('admin.provider-products.index'));

        $response->assertOk();

        $this->assertDatabaseHas('providers', [
            'user_id' => $providerWithoutProfile->id,
            'is_active' => true,
            'deleted_at' => null,
        ]);

        $this->assertDatabaseHas('providers', [
            'user_id' => $providerWithInactiveProfile->id,
            'is_active' => true,
            'deleted_at' => null,
        ]);

        $this->assertDatabaseHas('providers', [
            'id' => $trashedProvider->id,
            'user_id' => $providerWithTrashedProfile->id,
            'is_active' => true,
            'deleted_at' => null,
        ]);
    }

    public function test_non_admin_users_cannot_access_provider_product_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.provider-products.index'));

        $response->assertForbidden();
    }

    public function test_assignment_wizard_only_exposes_unassigned_products_per_provider(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $firstProvider = Provider::factory()->create();
        $secondProvider = Provider::factory()->create();

        $firstProduct = Product::factory()->create([
            'name' => 'Producto A',
        ]);
        $secondProduct = Product::factory()->create([
            'name' => 'Producto B',
        ]);
        $thirdProduct = Product::factory()->create([
            'name' => 'Producto C',
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $firstProvider->id,
            'product_id' => $firstProduct->id,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $secondProvider->id,
            'product_id' => $secondProduct->id,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.provider-products.index'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('admin/provider-products/index')
            ->where('available_product_ids_by_provider.'.$firstProvider->id, [
                $thirdProduct->id,
            ])
            ->where('available_product_ids_by_provider.'.$secondProvider->id, [
                $thirdProduct->id,
            ]));
    }

    public function test_admin_cannot_assign_a_product_already_assigned_to_another_provider(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $firstProvider = Provider::factory()->create();
        $secondProvider = Provider::factory()->create();
        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $firstProvider->id,
            'product_id' => $product->id,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.provider-products.store'), [
            'provider_id' => $secondProvider->id,
            'product_id' => $product->id,
            'original_price' => '100',
            'discount_value' => '10',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('product_id');

        $this->assertSame(
            1,
            ProviderProduct::query()->where('product_id', $product->id)->count(),
        );
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

    public function test_admin_can_define_individual_discount_percent_for_each_bulk_product(): void
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
            'product_discounts' => [
                ['product_id' => $firstProduct->id, 'discount_value' => '10'],
                ['product_id' => $secondProduct->id, 'discount_value' => '35'],
            ],
            'is_active' => true,
        ]);

        $response->assertRedirect(route('admin.provider-products.index'));
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $firstProduct->id,
            'discount_type' => 'percent',
            'discount_value' => 10,
            'special_price' => 90,
        ]);

        $this->assertDatabaseHas('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $secondProduct->id,
            'discount_type' => 'percent',
            'discount_value' => 35,
            'special_price' => 162.5,
        ]);
    }

    public function test_admin_cannot_create_bulk_assignment_without_discount_for_each_product(): void
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
            'product_discounts' => [
                ['product_id' => $firstProduct->id, 'discount_value' => '15'],
            ],
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('product_discounts');

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $firstProduct->id,
        ]);

        $this->assertDatabaseMissing('provider_products', [
            'provider_id' => $provider->id,
            'product_id' => $secondProduct->id,
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
