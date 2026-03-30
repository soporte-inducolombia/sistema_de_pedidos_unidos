<?php

namespace App\Jobs;

use App\Exports\OrderConfirmedExport;
use App\Mail\OrderExcelForOrganizerMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class GenerateAndSendOrderExcelToOrganizerJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $uniqueFor = 3600;

    public function __construct(public int $orderId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->orderId;
    }

    public function handle(): void
    {
        $order = Order::query()
            ->with(['items', 'provider.user'])
            ->find($this->orderId);

        if ($order === null) {
            return;
        }

        $path = 'exports/orders/pedido-'.$order->public_id.'.xlsx';

        Excel::store(new OrderConfirmedExport($order), $path, 'local');

        try {
            Mail::to((string) config('orders.organizer_email'))->send(
                new OrderExcelForOrganizerMail($order, $path),
            );
        } finally {
            Storage::disk('local')->delete($path);
        }
    }
}
