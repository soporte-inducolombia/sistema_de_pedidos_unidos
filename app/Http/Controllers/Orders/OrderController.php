<?php

namespace App\Http\Controllers\Orders;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Jobs\SendOrderOtpMailJob;
use App\Models\Order;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Services\OrderOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $request->user()?->provider;

        if (! $provider instanceof Provider) {
            abort(403, 'El usuario autenticado no tiene un proveedor asociado.');
        }

        $payload = $request->validated();
        $itemsByProduct = collect($payload['items'])
            ->mapWithKeys(fn (array $item): array => [(int) $item['product_id'] => (int) $item['quantity']]);

        $providerProducts = ProviderProduct::query()
            ->with(['product.category'])
            ->where('provider_id', $provider->id)
            ->where('is_active', true)
            ->whereIn('product_id', $itemsByProduct->keys()->all())
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->get()
            ->keyBy('product_id');

        if ($providerProducts->count() !== $itemsByProduct->count()) {
            throw ValidationException::withMessages([
                'items' => 'Uno o mas productos no estan disponibles para este proveedor.',
            ]);
        }

        $otpCode = $otpService->generateCode();

        $order = DB::transaction(function () use ($payload, $provider, $providerProducts, $itemsByProduct, $otpCode, $otpService): Order {
            $order = Order::query()->create([
                'public_id' => (string) Str::uuid(),
                'provider_id' => $provider->id,
                'customer_email' => $payload['customer_email'],
                'status' => OrderStatus::PENDING,
                'subtotal_original' => 0,
                'subtotal_special' => 0,
                'total_discount' => 0,
            ]);

            $subtotalOriginalInCents = 0;
            $subtotalSpecialInCents = 0;

            foreach ($itemsByProduct as $productId => $quantity) {
                $providerProduct = $providerProducts->get($productId);

                if ($providerProduct === null || $providerProduct->product === null) {
                    continue;
                }

                $originalUnitInCents = (int) round(((float) $providerProduct->product->original_price) * 100);
                $specialUnitInCents = (int) round(((float) $providerProduct->special_price) * 100);

                $lineOriginalInCents = $originalUnitInCents * $quantity;
                $lineSpecialInCents = $specialUnitInCents * $quantity;

                $subtotalOriginalInCents += $lineOriginalInCents;
                $subtotalSpecialInCents += $lineSpecialInCents;

                $order->items()->create([
                    'provider_product_id' => $providerProduct->id,
                    'product_id' => $providerProduct->product->id,
                    'snapshot_product_name' => $providerProduct->product->name,
                    'snapshot_sku' => $providerProduct->product->sku,
                    'snapshot_category_name' => $providerProduct->product->category?->name,
                    'unit_original_price' => $originalUnitInCents / 100,
                    'unit_special_price' => $specialUnitInCents / 100,
                    'quantity' => $quantity,
                    'line_original_total' => $lineOriginalInCents / 100,
                    'line_special_total' => $lineSpecialInCents / 100,
                ]);
            }

            $order->update([
                'subtotal_original' => $subtotalOriginalInCents / 100,
                'subtotal_special' => $subtotalSpecialInCents / 100,
                'total_discount' => ($subtotalOriginalInCents - $subtotalSpecialInCents) / 100,
            ]);

            $order->otp()->create([
                'code_hash' => $otpService->hashCode($otpCode),
                'expires_at' => $otpService->expiration(),
                'max_attempts' => (int) config('orders.otp.max_attempts', 5),
                'last_sent_at' => now(),
            ]);

            return $order->fresh(['items', 'otp']);
        });

        SendOrderOtpMailJob::dispatch($order->id, $otpCode)
            ->onQueue((string) config('orders.queues.otp', 'mails'))
            ->afterCommit();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Orden generada en estado pendiente. OTP enviado al cliente.',
                'order' => [
                    'public_id' => $order->public_id,
                    'status' => $order->status,
                    'customer_email' => $order->customer_email,
                    'subtotal_original' => $order->subtotal_original,
                    'subtotal_special' => $order->subtotal_special,
                    'total_discount' => $order->total_discount,
                    'otp_expires_at' => $order->otp?->expires_at,
                ],
            ], 201);
        }

        return to_route('dashboard')->with('status', 'Orden generada correctamente. OTP enviado al cliente.');
    }
}
