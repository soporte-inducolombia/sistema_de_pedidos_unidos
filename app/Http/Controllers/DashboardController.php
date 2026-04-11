<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $adminSummary = null;
        $providerWorkspace = null;

        if ($user?->isAdmin()) {
            $counts = DB::table('orders')
                ->selectRaw("COUNT(*) as total, SUM(status = 'pending') as pending, SUM(status = 'confirmed') as confirmed")
                ->whereNull('deleted_at')
                ->first();

            $adminSummary = [
                'products_count' => Product::query()->count(),
                'providers_count' => Provider::query()->count(),
                'pending_orders_count' => (int) ($counts->pending ?? 0),
                'confirmed_orders_count' => (int) ($counts->confirmed ?? 0),
                'recent_orders' => Order::query()
                    ->with('provider.user:id,username')
                    ->latest()
                    ->limit(6)
                    ->get()
                    ->map(fn (Order $order): array => [
                        'public_id' => $order->public_id,
                        'order_number' => $order->order_number,
                        'status' => $order->status->value,
                        'customer_email' => $order->customer_email,
                        'provider_name' => $order->provider?->company_name,
                        'provider_username' => $order->provider?->user?->username,
                        'subtotal_special' => (string) $order->subtotal_special,
                        'total_discount' => (string) $order->total_discount,
                        'created_at' => $order->created_at?->toISOString(),
                    ])
                    ->values()
                    ->all(),
            ];
        }

        if ($user?->isProvider() && $user->provider !== null) {
            $provider = $user->provider;

            $productsCount = ProviderProduct::query()
                ->where('provider_id', $provider->id)
                ->where('is_active', true)
                ->whereHas('product', fn ($query) => $query->where('is_active', true))
                ->count();

            $orderCounts = DB::table('orders')
                ->selectRaw("SUM(status = 'pending') as pending, SUM(status = 'confirmed') as confirmed, SUM(subtotal_special) as total_sales")
                ->where('provider_id', $provider->id)
                ->whereNull('deleted_at')
                ->first();

            $recentOrders = Order::query()
                ->where('provider_id', $provider->id)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Order $order): array => [
                    'public_id' => $order->public_id,
                    'order_number' => $order->order_number ?? $order->id,
                    'status' => $order->status->value,
                    'customer_email' => $order->customer_email,
                    'subtotal_special' => (string) $order->subtotal_special,
                    'total_discount' => (string) $order->total_discount,
                    'created_at' => $order->created_at?->toISOString(),
                    'confirmed_at' => $order->confirmed_at?->toISOString(),
                ])
                ->values()
                ->all();

            $providerWorkspace = [
                'provider' => [
                    'company_name' => $provider->company_name,
                    'stand_label' => $provider->stand_label,
                ],
                'metrics' => [
                    'products_count' => $productsCount,
                    'pending_orders_count' => (int) ($orderCounts->pending ?? 0),
                    'confirmed_orders_count' => (int) ($orderCounts->confirmed ?? 0),
                    'total_sales' => (float) ($orderCounts->total_sales ?? 0),
                ],
                'recent_orders' => $recentOrders,
            ];
        }

        return Inertia::render('dashboard', [
            'status' => $request->session()->get('status'),
            'adminSummary' => $adminSummary,
            'providerWorkspace' => $providerWorkspace,
        ]);
    }
}
