<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure admins can access products administration.
     */
    public function test_admin_can_view_products_management_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $product = Product::factory()->create([
            'name' => 'Lapicero azul',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.products.index'));

        $response->assertOk();
        $response->assertSee($product->name);
    }

    public function test_non_admin_users_cannot_access_products_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.products.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_create_and_update_a_product(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $createResponse = $this->actingAs($admin)->post(route('admin.products.store'), [
            'code' => 'COD-PRUEBA-01',
            'barcode' => '7700000000011',
            'name' => 'Cuaderno pruebas',
            'description' => 'Descripcion inicial',
            'original_price' => '125.90',
            'is_active' => true,
        ]);

        $createResponse->assertRedirect(route('admin.products.index'));

        $product = Product::query()->where('code', 'COD-PRUEBA-01')->firstOrFail();

        $updateResponse = $this->actingAs($admin)->patch(route('admin.products.update', $product), [
            'code' => 'COD-PRUEBA-02',
            'barcode' => '7700000000012',
            'name' => 'Cuaderno pruebas v2',
            'description' => 'Descripcion actualizada',
            'original_price' => '149.00',
            'is_active' => false,
        ]);

        $updateResponse->assertRedirect(route('admin.products.index'));

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'code' => 'COD-PRUEBA-02',
            'barcode' => '7700000000012',
            'name' => 'Cuaderno pruebas v2',
            'is_active' => false,
        ]);
    }

    public function test_admin_can_delete_unassigned_product_but_cannot_delete_assigned_product(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $freeProduct = Product::factory()->create();
        $assignedProduct = Product::factory()->create();

        ProviderProduct::factory()->create([
            'product_id' => $assignedProduct->id,
        ]);

        $deleteFreeResponse = $this->actingAs($admin)->delete(route('admin.products.destroy', $freeProduct));
        $deleteFreeResponse->assertRedirect(route('admin.products.index'));

        $this->assertSoftDeleted('products', [
            'id' => $freeProduct->id,
        ]);

        $deleteAssignedResponse = $this->actingAs($admin)->delete(route('admin.products.destroy', $assignedProduct));
        $deleteAssignedResponse->assertSessionHasErrors('deleteProduct');

        $this->assertDatabaseHas('products', [
            'id' => $assignedProduct->id,
        ]);
    }
}
