<?php

namespace App\Jobs;

use App\Exports\OrderConfirmedExport;
use App\Mail\OrderExcelForOrganizerMail;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Throwable;

class GenerateAndSendOrderExcelToOrganizerJob implements ShouldBeUnique, ShouldQueue
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
            throw new RuntimeException('No se encontro la orden para generar el excel del organizador.');
        }

        $organizerEmail = (string) config('orders.organizer_email');

        if (blank($organizerEmail)) {
            throw new RuntimeException('No hay correo configurado para el organizador.');
        }

        $path = 'exports/orders/pedido-'.$order->public_id.'.xlsx';

        Excel::store(new OrderConfirmedExport($order), $path, 'local');

        try {
            Mail::mailer((string) config('orders.mail.mailer', config('mail.default', 'smtp')))
                ->to($organizerEmail)
                ->send(new OrderExcelForOrganizerMail($order, $path));
        } finally {
            Storage::disk('local')->delete($path);
        }
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Fallo el envio del excel al organizador.', [
            'job' => self::class,
            'order_id' => $this->orderId,
            'exception' => $exception->getMessage(),
        ]);
    }
}
