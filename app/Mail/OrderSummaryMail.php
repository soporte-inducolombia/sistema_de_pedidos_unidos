<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderSummaryMail extends Mailable
{
    use Queueable;

    public function __construct(public Order $order, public string $recipientType) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Orden Nro '.$this->orderNumber().' confirmada | Resumen UNIDOS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.summary',
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
