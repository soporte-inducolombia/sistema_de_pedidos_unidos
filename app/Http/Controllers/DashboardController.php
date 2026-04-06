<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Services\OrderOtpService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request, OrderOtpService $otpService): Response
    {
        $user = $request->user();

        $adminSummary = null;
        $providerWorkspace = null;

        if ($user?->isAdmin()) {
            $adminSummary = [
                'products_count' => Product::query()->count(),
                'providers_count' => Provider::query()->count(),
                'pending_orders_count' => Order::query()->where('status', 'pending')->count(),
                'confirmed_orders_count' => Order::query()->where('status', 'confirmed')->count(),
                'recent_orders' => Order::query()
                    ->with('provider.user:id,email')
                    ->latest()
                    ->limit(6)
                    ->get()
                    ->map(fn (Order $order): array => [
                        'public_id' => $order->public_id,
                        'order_number' => $order->order_number,
                        'status' => $order->status->value,
                        'customer_email' => $order->customer_email,
                        'provider_name' => $order->provider?->company_name,
                        'provider_email' => $order->provider?->user?->email,
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

            $pendingOrdersCount = Order::query()
                ->where('provider_id', $provider->id)
                ->where('status', 'pending')
                ->count();

            $confirmedOrdersCount = Order::query()
                ->where('provider_id', $provider->id)
                ->where('status', 'confirmed')
                ->count();

            $totalSavings = (float) Order::query()
                ->where('provider_id', $provider->id)
                ->sum('total_discount');

            $recentOrders = Order::query()
                ->with('otp')
                ->where('provider_id', $provider->id)
                ->latest()
                ->limit(10)
                ->get()
                ->map(function (Order $order) use ($otpService): array {
                    $otp = $order->otp;

                    return [
                        'public_id' => $order->public_id,
                        'order_number' => $order->order_number ?? $order->id,
                        'status' => $order->status->value,
                        'customer_email' => $order->customer_email,
                        'subtotal_special' => (string) $order->subtotal_special,
                        'total_discount' => (string) $order->total_discount,
                        'created_at' => $order->created_at?->toISOString(),
                        'confirmed_at' => $order->confirmed_at?->toISOString(),
                        'otp_expires_at' => $otp?->expires_at?->toISOString(),
                        'otp_attempts_remaining' => $otp === null ? 0 : max(0, $otp->max_attempts - $otp->attempts),
                        'otp_resend_count' => $otp?->resend_count,
                        'can_resend_otp' => $otp !== null
                            && $otp->verified_at === null
                            && $order->status->value === 'pending'
                            && $otpService->canResend($otp),
                    ];
                })
                ->values()
                ->all();

            $providerWorkspace = [
                'provider' => [
                    'company_name' => $provider->company_name,
                    'stand_label' => $provider->stand_label,
                ],
                'metrics' => [
                    'products_count' => $productsCount,
                    'pending_orders_count' => $pendingOrdersCount,
                    'confirmed_orders_count' => $confirmedOrdersCount,
                    'total_savings' => $totalSavings,
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
