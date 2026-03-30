<?php

namespace App\Listeners;

use App\Events\OrderConfirmed;
use App\Jobs\GenerateAndSendOrderExcelToOrganizerJob;
use App\Jobs\SendOrderSummaryToCustomerJob;
use App\Jobs\SendOrderSummaryToProviderJob;

class QueueOrderConfirmedProcesses
{
    public function handle(OrderConfirmed $event): void
    {
        SendOrderSummaryToCustomerJob::dispatch($event->orderId)
            ->onQueue((string) config('orders.queues.notifications', 'mails'));

        SendOrderSummaryToProviderJob::dispatch($event->orderId)
            ->onQueue((string) config('orders.queues.notifications', 'mails'));

        GenerateAndSendOrderExcelToOrganizerJob::dispatch($event->orderId)
            ->onQueue((string) config('orders.queues.exports', 'exports'));
    }
}
