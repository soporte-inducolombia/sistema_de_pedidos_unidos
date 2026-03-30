<?php

namespace App\Jobs;

use App\Mail\OrderSummaryMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendOrderSummaryToProviderJob implements ShouldBeUnique, ShouldQueue
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

        if ($order === null || $order->provider?->user?->email === null) {
            return;
        }

        Mail::to($order->provider->user->email)->send(new OrderSummaryMail($order, 'proveedor'));
    }
}
