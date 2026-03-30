<?php

namespace App\Providers;

use App\Events\OrderConfirmed;
use App\Listeners\QueueOrderConfirmedProcesses;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        OrderConfirmed::class => [
            QueueOrderConfirmedProcesses::class,
        ],
    ];

    /**
     * Disable listener auto-discovery to avoid duplicate registrations.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}