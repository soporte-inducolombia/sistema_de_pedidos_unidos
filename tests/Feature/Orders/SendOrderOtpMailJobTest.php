<?php

namespace Tests\Feature\Orders;

use App\Jobs\SendOrderOtpMailJob;
use App\Mail\OrderOtpMail;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class SendOrderOtpMailJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_sends_otp_mail_to_customer(): void
    {
        Mail::fake();
        config()->set('orders.mail.mailer', 'array');

        $order = Order::factory()->create([
            'customer_email' => 'cliente@example.com',
        ]);

        $job = new SendOrderOtpMailJob($order->id, '123456');
        $job->handle();

        Mail::assertSent(OrderOtpMail::class, function (OrderOtpMail $mail) use ($order): bool {
            return $mail->hasTo($order->customer_email) && $mail->code === '123456';
        });
    }

    public function test_job_throws_exception_when_order_is_missing(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No se encontro la orden para enviar OTP.');

        $job = new SendOrderOtpMailJob(999999, '123456');
        $job->handle();
    }
}
