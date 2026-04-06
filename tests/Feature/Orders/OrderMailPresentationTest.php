<?php

namespace Tests\Feature\Orders;

use App\Mail\OrderExcelForOrganizerMail;
use App\Mail\OrderOtpMail;
use App\Mail\OrderSummaryMail;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderMailPresentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_otp_mail_uses_system_order_number_in_subject_and_body(): void
    {
        $order = Order::factory()->create([
            'order_number' => 27,
        ]);

        $mail = new OrderOtpMail($order, '123456');

        $this->assertSame(
            'Codigo OTP para confirmar Orden Nro 27 | UNIDOS',
            $mail->envelope()->subject,
        );

        $html = $mail->render();

        $this->assertStringContainsString('Orden Nro 27', $html);
        $this->assertStringNotContainsString($order->public_id, $html);
    }

    public function test_order_summary_mail_uses_system_order_number_in_subject_and_body(): void
    {
        $order = Order::factory()->create([
            'order_number' => 41,
        ]);

        $mail = new OrderSummaryMail($order, 'cliente');

        $this->assertSame(
            'Orden Nro 41 confirmada | Resumen UNIDOS',
            $mail->envelope()->subject,
        );

        $html = $mail->render();

        $this->assertStringContainsString('Orden Nro 41', $html);
        $this->assertStringNotContainsString($order->public_id, $html);
    }

    public function test_order_organizer_mail_uses_system_order_number_in_subject_and_body(): void
    {
        $order = Order::factory()->create([
            'order_number' => 52,
        ]);

        $mail = new OrderExcelForOrganizerMail($order, 'exports/orders/test.xlsx');

        $this->assertSame(
            'Orden Nro 52 confirmada | Control UNIDOS',
            $mail->envelope()->subject,
        );

        $html = $mail->render();

        $this->assertStringContainsString('Orden Nro 52', $html);
        $this->assertStringNotContainsString($order->public_id, $html);
    }

    public function test_order_mails_use_order_id_when_order_number_is_missing(): void
    {
        $order = Order::factory()->create([
            'order_number' => null,
        ]);

        $mail = new OrderOtpMail($order, '123456');

        $this->assertSame(
            'Codigo OTP para confirmar Orden Nro '.$order->id.' | UNIDOS',
            $mail->envelope()->subject,
        );
    }
}
