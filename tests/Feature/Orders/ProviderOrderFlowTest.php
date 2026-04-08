<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderConfirmed;
use App\Jobs\GenerateAndSendOrderExcelToOrganizerJob;
use App\Jobs\SendOrderOtpMailJob;
use App\Jobs\SendOrderSummaryToCustomerJob;
use App\Jobs\SendOrderSummaryToProviderJob;
use App\Models\Order;
use App\Models\OrderOtp;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ProviderOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_can_create_pending_order_and_queue_otp_mail(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $productA = Product::factory()->create([
            'original_price' => 100,
        ]);
        $productB = Product::factory()->create([
            'original_price' => 50,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $productA->id,
            'special_price' => 90,
            'is_active' => true,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $productB->id,
            'special_price' => 40,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 2, 'discount_percent' => 10],
                ['product_id' => $productB->id, 'quantity' => 1, 'discount_percent' => 20],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('order.status', OrderStatus::PENDING->value);

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 2);
        $this->assertDatabaseCount('order_otps', 1);

        Queue::assertPushed(SendOrderOtpMailJob::class, 1);
    }

    public function test_provider_order_uses_assignment_discount_even_if_payload_sends_custom_values(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $productA = Product::factory()->create([
            'original_price' => 100,
        ]);
        $productB = Product::factory()->create([
            'original_price' => 50,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $productA->id,
            'discount_value' => 5,
            'special_price' => 95,
            'is_active' => true,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $productB->id,
            'discount_value' => 10,
            'special_price' => 45,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente.descuento@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 2, 'discount_percent' => 25],
                ['product_id' => $productB->id, 'quantity' => 1, 'discount_percent' => 10],
            ],
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('orders', [
            'provider_id' => $provider->id,
            'customer_email' => 'cliente.descuento@example.com',
            'subtotal_original' => '250.00',
            'subtotal_special' => '235.00',
            'total_discount' => '15.00',
        ]);

        $this->assertDatabaseHas('order_items', [
            'product_id' => $productA->id,
            'unit_special_price' => '95.00',
            'line_special_total' => '190.00',
        ]);

        $this->assertDatabaseHas('order_items', [
            'product_id' => $productB->id,
            'unit_special_price' => '45.00',
            'line_special_total' => '45.00',
        ]);
    }

    public function test_provider_cannot_create_order_with_quantity_that_is_not_packaging_multiple(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
            'packaging_multiple' => 5,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'special_price' => 90,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente.packaging@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3, 'discount_percent' => 10],
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }

    public function test_provider_can_link_order_with_registered_customer_user(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 120,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'discount_value' => 10,
            'special_price' => 108,
            'is_active' => true,
        ]);

        $customer = User::factory()->create([
            'role' => 'cliente',
            'name' => 'Cliente Registrado',
            'email' => 'cliente.registrado@example.com',
            'nit' => '800100200-3',
            'business_name' => 'Cliente Registrado SAS',
            'supermarket_name' => 'Super Cliente',
            'city' => 'Bogota',
            'department' => 'Cundinamarca',
        ]);

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_user_id' => $customer->id,
            'customer_email' => 'cliente.registrado@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1, 'discount_percent' => 10],
            ],
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('orders', [
            'provider_id' => $provider->id,
            'customer_user_id' => $customer->id,
            'customer_email' => 'cliente.registrado@example.com',
        ]);
    }

    public function test_order_numbers_are_assigned_sequentially_per_provider(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'special_price' => 90,
            'is_active' => true,
        ]);

        $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente1@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1, 'discount_percent' => 10],
            ],
        ])->assertCreated();

        $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente2@example.com',
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2, 'discount_percent' => 10],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('orders', [
            'provider_id' => $provider->id,
            'customer_email' => 'cliente1@example.com',
            'order_number' => 1,
        ]);

        $this->assertDatabaseHas('orders', [
            'provider_id' => $provider->id,
            'customer_email' => 'cliente2@example.com',
            'order_number' => 2,
        ]);
    }

    public function test_provider_cannot_create_order_without_customer_signature(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $product = Product::factory()->create([
            'original_price' => 100,
        ]);

        ProviderProduct::factory()->create([
            'provider_id' => $provider->id,
            'product_id' => $product->id,
            'special_price' => 90,
            'is_active' => true,
        ]);

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.store'), [
            'customer_email' => 'cliente@example.com',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1, 'discount_percent' => 10],
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_signature']);
    }

    public function test_provider_can_confirm_order_with_valid_otp_and_dispatch_event(): void
    {
        Event::fake([OrderConfirmed::class]);

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::PENDING,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
        ]);

        $response = $this->actingAs($provider->user)->postJson(
            route('provider.orders.verify-otp', $order),
            ['code' => '123456'],
        );

        $response
            ->assertOk()
            ->assertJsonPath('order.status', OrderStatus::CONFIRMED->value);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::CONFIRMED->value,
        ]);

        $this->assertDatabaseMissing('order_otps', [
            'order_id' => $order->id,
            'verified_at' => null,
        ]);

        Event::assertDispatched(OrderConfirmed::class, fn (OrderConfirmed $event): bool => $event->orderId === $order->id);
    }

    public function test_confirming_order_queues_all_post_confirmation_jobs(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::PENDING,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
        ]);

        $response = $this->actingAs($provider->user)->postJson(
            route('provider.orders.verify-otp', $order),
            ['code' => '123456'],
        );

        $response->assertOk();

        Queue::assertPushed(SendOrderSummaryToCustomerJob::class, 1);
        Queue::assertPushed(SendOrderSummaryToProviderJob::class, 1);
        Queue::assertPushed(GenerateAndSendOrderExcelToOrganizerJob::class, 1);
    }

    public function test_provider_cannot_confirm_with_invalid_otp(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::PENDING,
        ]);

        OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
        ]);

        $response = $this->actingAs($provider->user)->postJson(
            route('provider.orders.verify-otp', $order),
            ['code' => '000000'],
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $this->assertDatabaseHas('order_otps', [
            'order_id' => $order->id,
            'attempts' => 1,
            'verified_at' => null,
        ]);
    }

    public function test_provider_can_resend_otp_when_order_is_expired(): void
    {
        Queue::fake();

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::EXPIRED,
        ]);

        $otp = OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->subMinutes(1),
            'attempts' => 3,
            'max_attempts' => 5,
            'resend_count' => 0,
            'last_sent_at' => now()->subMinutes(2),
        ]);

        $response = $this->actingAs($provider->user)->postJson(
            route('provider.orders.resend-otp', $order),
        );

        $response
            ->assertOk()
            ->assertJsonPath('message', 'OTP reenviado al correo del cliente.');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::PENDING->value,
        ]);

        $otp->refresh();

        $this->assertSame(0, $otp->attempts);
        $this->assertSame(1, $otp->resend_count);
        $this->assertTrue($otp->expires_at !== null && $otp->expires_at->isFuture());

        Queue::assertPushed(SendOrderOtpMailJob::class, 1);
    }

    private function customerSignature(): string
    {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5xLwAAAABJRU5ErkJggg==';
    }
}
