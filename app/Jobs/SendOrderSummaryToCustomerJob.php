<?php

namespace App\Jobs;

use App\Mail\OrderSummaryMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class SendOrderSummaryToCustomerJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $uniqueFor = 3600;

    public int $tries;

    public int $timeout;

    public function __construct(public int $orderId)
    {
        $this->tries = (int) config('orders.mail.tries', 3);
        $this->timeout = (int) config('orders.mail.timeout_seconds', 30);
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return array_map(
            static fn (mixed $value): int => (int) $value,
            (array) config('orders.mail.backoff_seconds', [10, 30, 120]),
        );
    }

    public function uniqueId(): string
    {
        return (string) $this->orderId;
    }

    public function handle(): void
    {
        $order = Order::query()
            ->with(['items.product', 'provider.user'])
            ->find($this->orderId);

        if ($order === null) {
            throw new RuntimeException('No se encontro la orden para enviar resumen al cliente.');
        }

        if (blank($order->customer_email)) {
            throw new RuntimeException('La orden no tiene correo de cliente para enviar resumen.');
        }

        Mail::mailer((string) config('orders.mail.mailer', config('mail.default', 'smtp')))
            ->to($order->customer_email)
            ->send(new OrderSummaryMail($order, 'cliente'));
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Fallo el envio del resumen al cliente.', [
            'job' => self::class,
            'order_id' => $this->orderId,
            'exception' => $exception->getMessage(),
        ]);
    }
}
