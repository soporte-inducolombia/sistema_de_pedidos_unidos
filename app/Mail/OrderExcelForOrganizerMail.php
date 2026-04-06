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

    public function __construct(public Order $order, public string $excelPath) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Orden Nro '.$this->orderNumber().' confirmada | Control UNIDOS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.organizer',
            with: [
                'orderNumber' => $this->orderNumber(),
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromStorageDisk('local', $this->excelPath)
                ->as('orden-nro-'.$this->orderNumber().'.xlsx')
                ->withMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ];
    }

    private function orderNumber(): int
    {
        return $this->order->order_number ?? $this->order->id;
    }
}
