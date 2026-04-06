<?php

namespace Tests\Feature\Orders;

use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProviderOrderCreatePageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure provider has a dedicated order creation page in the sidebar flow.
     */
    public function test_provider_can_open_create_order_page_and_see_assigned_products(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'name' => 'Galleta integral',
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->get(route('provider.orders.create'));

        $response->assertOk();
        $response->assertSee('Crear pedidos');
        $response->assertSee('Paso 1');
        $response->assertSee('Paso 2');
        $response->assertSee('Paso 3');
        $response->assertSee($provider->company_name);
        $response->assertSee($product->name);
    }

    public function test_non_provider_user_cannot_open_create_order_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->get(route('provider.orders.create'));

        $response->assertForbidden();
    }
}
