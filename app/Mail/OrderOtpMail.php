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

    public function __construct(public Order $order, public string $code)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Codigo de verificacion de pedido '.$this->order->public_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.otp-code',
        );
    }
}
