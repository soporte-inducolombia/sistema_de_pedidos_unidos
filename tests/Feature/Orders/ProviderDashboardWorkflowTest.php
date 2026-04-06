<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderOtp;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ProviderDashboardWorkflowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure provider workflow works from dashboard-style form submissions.
     */
    public function test_provider_can_view_dashboard_with_orders_summary_only(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'name' => 'Marcador borrable',
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertSee($provider->company_name);
        $response->assertSee('Gestion de pedidos');
    }

    public function test_provider_can_create_order_from_dashboard_and_get_redirect(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 120,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'special_price' => 100,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->post(route('provider.orders.store'), [
            'customer_email' => 'cliente.dashboard@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ]);

        $response->assertRedirect(route('provider.orders.index'));
        $response->assertSessionHas('status');
        $response->assertSessionHas('pending_otp_order_public_id');

        $this->assertDatabaseHas('orders', [
            'provider_id' => $provider->id,
            'customer_email' => 'cliente.dashboard@example.com',
            'status' => OrderStatus::PENDING->value,
        ]);
    }

    public function test_provider_can_confirm_and_resend_otp_through_redirect_endpoints(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $orderToConfirm = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::PENDING,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $orderToConfirm->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'resend_count' => 0,
            'last_sent_at' => now()->subMinutes(2),
        ]);

        $confirmResponse = $this->actingAs($provider->user)->post(route('provider.orders.verify-otp', $orderToConfirm), [
            'code' => '123456',
        ]);

        $confirmResponse->assertRedirect(route('provider.orders.index'));
        $this->assertDatabaseHas('orders', [
            'id' => $orderToConfirm->id,
            'status' => OrderStatus::CONFIRMED->value,
        ]);

        $orderToResend = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::EXPIRED,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $orderToResend->id,
            'code_hash' => Hash::make('654321'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'resend_count' => 0,
            'last_sent_at' => now()->subMinutes(2),
        ]);

        $resendResponse = $this->actingAs($provider->user)->post(route('provider.orders.resend-otp', $orderToResend));

        $resendResponse->assertRedirect(route('provider.orders.index'));
        $resendResponse->assertSessionHas('status');
        $resendResponse->assertSessionHas('pending_otp_order_public_id', $orderToResend->public_id);
        $this->assertDatabaseHas('orders', [
            'id' => $orderToResend->id,
            'status' => OrderStatus::PENDING->value,
        ]);
    }

    private function customerSignature(): string
    {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5xLwAAAABJRU5ErkJggg==';
    }
}
