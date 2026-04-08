<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Jobs\SendOrderOtpMailJob;
use App\Models\Order;
use App\Models\OrderOtp;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProviderOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure provider can manage orders from dedicated module.
     */
    public function test_provider_can_open_orders_module_and_see_order_numbers(): void
    {
        Storage::fake('local');

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $signaturePath = "order-signatures/provider-{$provider->id}/order-1.png";
        Storage::disk('local')->put($signaturePath, 'fake-signature');

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => 1,
            'customer_email' => 'cliente.modulo@example.com',
            'customer_signature_path' => $signaturePath,
            'status' => OrderStatus::PENDING,
        ]);

        $response = $this->actingAs($provider->user)->get(route('provider.orders.index'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('provider/orders/index')
                ->has('providerWorkspace.orders', 1)
                ->where('providerWorkspace.orders.0.order_number', 1)
                ->where('providerWorkspace.orders.0.customer_email', $order->customer_email));
    }

    public function test_provider_receives_order_workspace_with_base_price_default_discount_and_packaging(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_value' => 20,
            'special_price' => 80,
            'is_active' => true,
        ]);

        $this->actingAs($provider->user)
            ->get(route('provider.orders.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('provider/orders/create')
                ->has('providerWorkspace.products', 1)
                ->where('providerWorkspace.products.0.original_price', '100.00')
                ->where('providerWorkspace.products.0.default_discount_percent', '20.00')
                ->where('providerWorkspace.products.0.packaging_multiple', 1)
                ->missing('providerWorkspace.products.0.code')
                ->missing('providerWorkspace.products.0.barcode'),
            );
    }

    public function test_provider_can_update_pending_order_from_orders_module(): void
    {
        Storage::fake('local');
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        $providerProduct = ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_value' => 20,
            'special_price' => 80,
            'is_active' => true,
        ]);

        $oldSignaturePath = "order-signatures/provider-{$provider->id}/old-signature.png";
        Storage::disk('local')->put($oldSignaturePath, 'old-signature');

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => 1,
            'customer_email' => 'cliente.original@example.com',
            'customer_signature_path' => $oldSignaturePath,
            'status' => OrderStatus::PENDING,
        ]);

        $order->items()->create([
            'provider_product_id' => $providerProduct->id,
            'product_id' => $product->id,
            'snapshot_product_name' => $product->name,
            'snapshot_sku' => $product->code,
            'snapshot_category_name' => null,
            'unit_original_price' => 100,
            'unit_special_price' => 80,
            'quantity' => 1,
            'line_original_total' => 100,
            'line_special_total' => 80,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'resend_count' => 0,
            'last_sent_at' => now()->subMinutes(2),
        ]);

        $response = $this->actingAs($provider->user)->patch(route('provider.orders.update', $order), [
            'customer_email' => 'cliente.actualizado@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 3,
                    'discount_percent' => 25,
                ],
            ],
        ]);

        $response->assertRedirect(route('provider.orders.index'));
        $response->assertSessionHas('status');

        $order->refresh();

        $this->assertSame('cliente.actualizado@example.com', $order->customer_email);
        $this->assertSame(1, $order->order_number);
        $this->assertNotNull($order->customer_signature_path);
        $this->assertNotSame($oldSignaturePath, $order->customer_signature_path);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_special_price' => '80.00',
        ]);

        Storage::disk('local')->assertMissing($oldSignaturePath);
        Storage::disk('local')->assertExists((string) $order->customer_signature_path);

        Queue::assertPushed(SendOrderOtpMailJob::class, 1);
    }

    public function test_provider_can_delete_pending_order_from_orders_module(): void
    {
        Storage::fake('local');

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $signaturePath = "order-signatures/provider-{$provider->id}/delete-signature.png";
        Storage::disk('local')->put($signaturePath, 'delete-signature');

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => 1,
            'customer_signature_path' => $signaturePath,
            'status' => OrderStatus::PENDING,
        ]);

        $response = $this->actingAs($provider->user)->delete(route('provider.orders.destroy', $order));

        $response->assertRedirect(route('provider.orders.index'));
        $this->assertSoftDeleted('orders', [
            'id' => $order->id,
        ]);
        Storage::disk('local')->assertExists($signaturePath);
    }

    public function test_provider_cannot_edit_confirmed_order_from_orders_module(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'special_price' => 80,
            'is_active' => true,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => 1,
            'status' => OrderStatus::CONFIRMED,
        ]);

        $response = $this->actingAs($provider->user)->patchJson(route('provider.orders.update', $order), [
            'customer_email' => 'cliente.confirmado@example.com',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'discount_percent' => 20,
                ],
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['order']);
    }

    private function customerSignature(): string
    {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5xLwAAAABJRU5ErkJggg==';
    }
}
