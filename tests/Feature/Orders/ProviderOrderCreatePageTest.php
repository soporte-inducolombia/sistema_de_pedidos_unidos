<?php

namespace Tests\Feature\Orders;

use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('provider/orders/create')
                ->where('providerWorkspace.provider.company_name', $provider->company_name)
                ->has('providerWorkspace.products', 1)
                ->where('providerWorkspace.products.0.product_name', $product->name));
    }

    public function test_non_provider_user_cannot_open_create_order_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->get(route('provider.orders.create'));

        $response->assertForbidden();
    }

    public function test_provider_create_page_includes_registered_customers_list(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $customer = User::factory()->create([
            'role' => 'cliente',
            'name' => 'Cliente Demo',
            'email' => 'cliente.demo@example.com',
            'nit' => '900555111-2',
            'business_name' => 'Cliente Demo SAS',
            'supermarket_name' => 'Super Demo',
            'city' => 'Cali',
            'department' => 'Valle del Cauca',
        ]);

        $response = $this->actingAs($provider->user)->get(route('provider.orders.create'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('provider/orders/create')
                ->has('providerWorkspace.customers', 1)
                ->where('providerWorkspace.customers.0.id', $customer->id)
                ->where('providerWorkspace.customers.0.supermarket_name', 'Super Demo'));
    }
}
