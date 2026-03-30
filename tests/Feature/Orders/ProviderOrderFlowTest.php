<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderConfirmed;
use App\Jobs\GenerateAndSendOrderExcelToOrganizerJob;
use App\Jobs\SendOrderOtpMailJob;
use App\Jobs\SendOrderSummaryToCustomerJob;
use App\Jobs\SendOrderSummaryToProviderJob;
use App\Models\Category;
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

        $category = Category::factory()->create();
        $productA = Product::factory()->create([
            'category_id' => $category->id,
            'original_price' => 100,
        ]);
        $productB = Product::factory()->create([
            'category_id' => $category->id,
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
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 2],
                ['product_id' => $productB->id, 'quantity' => 1],
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
}
