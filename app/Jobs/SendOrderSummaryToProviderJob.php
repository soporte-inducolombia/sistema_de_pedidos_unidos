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

class SendOrderSummaryToProviderJob implements ShouldBeUnique, ShouldQueue
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
            ->with(['items', 'provider.user'])
            ->find($this->orderId);

        if ($order === null) {
            throw new RuntimeException('No se encontro la orden para enviar resumen al proveedor.');
        }

        if (blank($order->provider?->user?->email)) {
            throw new RuntimeException('No se encontro correo del proveedor para enviar resumen.');
        }

        Mail::mailer((string) config('orders.mail.mailer', config('mail.default', 'smtp')))
            ->to($order->provider->user->email)
            ->send(new OrderSummaryMail($order, 'proveedor'));
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Fallo el envio del resumen al proveedor.', [
            'job' => self::class,
            'order_id' => $this->orderId,
            'exception' => $exception->getMessage(),
        ]);
    }
}
