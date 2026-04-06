<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderOtpMail extends Mailable
{
    use Queueable;

    public function __construct(public Order $order, public string $code) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Codigo OTP para confirmar Orden Nro '.$this->orderNumber().' | UNIDOS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.otp-code',
            with: [
                'orderNumber' => $this->orderNumber(),
            ],
        );
    }

    private function orderNumber(): int
    {
        return $this->order->order_number ?? $this->order->id;
    }
}
