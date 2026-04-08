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
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class OrderMailFailureHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_order_returns_accepted_instead_of_500_when_mail_fails_with_sync_queue(): void
    {
        config()->set('queue.default', 'sync');

        Mail::shouldReceive('mailer')->once()->andThrow(new RuntimeException('SMTP down'));

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
            'customer_signature' => $this->customerSignature(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1, 'discount_percent' => 10],
            ],
        ]);

        $response
            ->assertStatus(202)
            ->assertJsonPath('otp_delivery', 'failed');

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_otps', 1);
    }

    public function test_resending_otp_returns_validation_error_and_preserves_previous_otp_when_mail_fails(): void
    {
        config()->set('queue.default', 'sync');

        Mail::shouldReceive('mailer')->once()->andThrow(new RuntimeException('SMTP down'));

        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'status' => OrderStatus::PENDING,
        ]);

        $otp = OrderOtp::factory()->create([
            'order_id' => $order->id,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 1,
            'resend_count' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now()->subMinutes(2),
        ]);

        $originalCodeHash = $otp->code_hash;
        $originalResendCount = $otp->resend_count;

        $response = $this->actingAs($provider->user)->postJson(route('provider.orders.resend-otp', $order));

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $otp->refresh();

        $this->assertSame($originalCodeHash, $otp->code_hash);
        $this->assertSame($originalResendCount, $otp->resend_count);
    }

    private function customerSignature(): string
    {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5xLwAAAABJRU5ErkJggg==';
    }
}
