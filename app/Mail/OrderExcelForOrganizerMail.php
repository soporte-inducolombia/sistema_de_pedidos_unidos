<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderExcelForOrganizerMail extends Mailable
{
    use Queueable;

    public function __construct(public Order $order, public string $excelPath)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pedido confirmado para control UNIDOS '.$this->order->public_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.organizer',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromStorageDisk('local', $this->excelPath)
                ->as('pedido-'.$this->order->public_id.'.xlsx')
                ->withMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ];
    }
}
