<?php

namespace App\Jobs;

use App\Mail\OrderOtpMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendOrderOtpMailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $orderId, public string $code)
    {
    }

    public function handle(): void
    {
        $order = Order::query()->find($this->orderId);

        if ($order === null) {
            return;
        }

        Mail::to($order->customer_email)->send(new OrderOtpMail($order, $this->code));
    }
}
