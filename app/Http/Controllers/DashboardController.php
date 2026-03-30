<?php

namespace App\Http\Controllers;

use App\Models\Category;
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
                'categories_count' => Category::query()->count(),
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

            $providerProducts = ProviderProduct::query()
                ->with(['product.category'])
                ->where('provider_id', $provider->id)
                ->where('is_active', true)
                ->whereHas('product', fn ($query) => $query
                    ->where('is_active', true)
                    ->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('is_active', true)))
                ->get()
                ->sortBy(fn (ProviderProduct $providerProduct): string => (string) $providerProduct->product?->name)
                ->values()
                ->map(fn (ProviderProduct $providerProduct): array => [
                    'id' => $providerProduct->id,
                    'product_id' => $providerProduct->product_id,
                    'product_name' => $providerProduct->product?->name,
                    'sku' => $providerProduct->product?->sku,
                    'category_name' => $providerProduct->product?->category?->name,
                    'original_price' => (string) $providerProduct->product?->original_price,
                    'special_price' => (string) $providerProduct->special_price,
                    'discount_type' => $providerProduct->discount_type?->value,
                    'discount_value' => (string) $providerProduct->discount_value,
                ])
                ->all();

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
                'products' => $providerProducts,
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
