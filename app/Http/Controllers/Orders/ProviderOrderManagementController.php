<?php

namespace App\Http\Controllers\Orders;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\UpdateOrderRequest;
use App\Jobs\SendOrderOtpMailJob;
use App\Models\Order;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Services\OrderOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ProviderOrderManagementController extends Controller
{
    public function index(Request $request, OrderOtpService $otpService): Response
    {
        $provider = $this->resolveProvider($request);
        $providerProducts = $this->loadProviderProducts($provider->id);

        $orders = Order::query()
            ->with(['items', 'otp'])
            ->where('provider_id', $provider->id)
            ->latest()
            ->get()
            ->map(fn (Order $order): array => $this->mapOrderRow($order, $otpService))
            ->values()
            ->all();

        return Inertia::render('provider/orders/index', [
            'status' => $request->session()->get('status'),
            'pendingOtpOrderPublicId' => $request->session()->get('pending_otp_order_public_id'),
            'providerWorkspace' => [
                'provider' => [
                    'company_name' => $provider->company_name,
                    'stand_label' => $provider->stand_label,
                ],
                'products' => $providerProducts,
                'orders' => $orders,
            ],
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        if ($order->status !== OrderStatus::PENDING) {
            throw ValidationException::withMessages([
                'order' => 'Solo puedes editar pedidos pendientes.',
            ]);
        }

        $payload = $request->validated();
        $itemsByProduct = collect($payload['items'])
            ->mapWithKeys(fn (array $item): array => [
                (int) $item['product_id'] => [
                    'quantity' => (int) $item['quantity'],
                ],
            ]);

        $providerProducts = ProviderProduct::query()
            ->with('product')
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

        $newSignaturePath = null;

        if (isset($payload['customer_signature']) && is_string($payload['customer_signature'])) {
            $newSignaturePath = $this->storeCustomerSignature(
                $payload['customer_signature'],
                $provider->id,
                $order->public_id,
            );
        }

        $otpCode = $otpService->generateCode();
        $oldSignaturePath = $order->customer_signature_path;

        try {
            $updatedOrder = DB::transaction(function () use ($order, $provider, $payload, $itemsByProduct, $providerProducts, $otpService, $otpCode, $newSignaturePath): Order {
                $lockedOrder = Order::query()
                    ->whereKey($order->id)
                    ->with(['items', 'otp'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $this->ensureProviderOrder($lockedOrder, $provider);

                if ($lockedOrder->status !== OrderStatus::PENDING) {
                    throw ValidationException::withMessages([
                        'order' => 'Solo puedes editar pedidos pendientes.',
                    ]);
                }

                $signaturePath = $newSignaturePath ?? $lockedOrder->customer_signature_path;

                if ($signaturePath === null) {
                    throw ValidationException::withMessages([
                        'customer_signature' => 'La firma del cliente es obligatoria para actualizar el pedido.',
                    ]);
                }

                $lockedOrder->items()->delete();

                $subtotalOriginalInCents = 0;
                $subtotalSpecialInCents = 0;

                foreach ($itemsByProduct as $productId => $itemData) {
                    $providerProduct = $providerProducts->get($productId);

                    if ($providerProduct === null || $providerProduct->product === null) {
                        continue;
                    }

                    $quantity = (int) ($itemData['quantity'] ?? 0);
                    $discountPercent = round((float) $providerProduct->discount_value, 2);
                    $packagingMultiple = max(1, (int) $providerProduct->product->packaging_multiple);

                    if ($quantity < $packagingMultiple || $quantity % $packagingMultiple !== 0) {
                        throw ValidationException::withMessages([
                            'items' => sprintf(
                                'La cantidad de %s debe ser minimo %d y multiplo de %d.',
                                $providerProduct->product->name,
                                $packagingMultiple,
                                $packagingMultiple,
                            ),
                        ]);
                    }

                    $originalUnitInCents = (int) round(((float) $providerProduct->product->original_price) * 100);
                    $specialUnitInCents = max(
                        0,
                        (int) round($originalUnitInCents * ((100 - $discountPercent) / 100)),
                    );

                    $lineOriginalInCents = $originalUnitInCents * $quantity;
                    $lineSpecialInCents = $specialUnitInCents * $quantity;

                    $subtotalOriginalInCents += $lineOriginalInCents;
                    $subtotalSpecialInCents += $lineSpecialInCents;

                    $lockedOrder->items()->create([
                        'provider_product_id' => $providerProduct->id,
                        'product_id' => $providerProduct->product->id,
                        'snapshot_product_name' => $providerProduct->product->name,
                        'snapshot_sku' => $providerProduct->product->code,
                        'snapshot_category_name' => null,
                        'unit_original_price' => $originalUnitInCents / 100,
                        'unit_special_price' => $specialUnitInCents / 100,
                        'quantity' => $quantity,
                        'line_original_total' => $lineOriginalInCents / 100,
                        'line_special_total' => $lineSpecialInCents / 100,
                    ]);
                }

                $lockedOrder->update([
                    'customer_email' => $payload['customer_email'],
                    'customer_signature_path' => $signaturePath,
                    'subtotal_original' => $subtotalOriginalInCents / 100,
                    'subtotal_special' => $subtotalSpecialInCents / 100,
                    'total_discount' => ($subtotalOriginalInCents - $subtotalSpecialInCents) / 100,
                ]);

                if ($lockedOrder->otp === null) {
                    $lockedOrder->otp()->create([
                        'code_hash' => $otpService->hashCode($otpCode),
                        'expires_at' => $otpService->expiration(),
                        'max_attempts' => (int) config('orders.otp.max_attempts', 5),
                        'last_sent_at' => now(),
                    ]);
                } else {
                    $lockedOrder->otp->forceFill([
                        'code_hash' => $otpService->hashCode($otpCode),
                        'expires_at' => $otpService->expiration(),
                        'verified_at' => null,
                        'attempts' => 0,
                        'resend_count' => 0,
                        'max_attempts' => (int) config('orders.otp.max_attempts', 5),
                        'last_sent_at' => now(),
                    ])->save();
                }

                return $lockedOrder->fresh(['otp']);
            });
        } catch (Throwable $exception) {
            if ($newSignaturePath !== null) {
                Storage::disk('local')->delete($newSignaturePath);
            }

            throw $exception;
        }

        if ($newSignaturePath !== null && $oldSignaturePath !== null && $oldSignaturePath !== $newSignaturePath) {
            Storage::disk('local')->delete($oldSignaturePath);
        }

        $otpSent = true;

        try {
            SendOrderOtpMailJob::dispatch($updatedOrder->id, $otpCode)
                ->onQueue((string) config('orders.queues.otp', 'mails'))
                ->afterCommit();
        } catch (Throwable $exception) {
            $otpSent = false;

            Log::error('No fue posible despachar OTP despues de editar la orden.', [
                'order_id' => $updatedOrder->id,
                'customer_email' => $updatedOrder->customer_email,
                'queue_connection' => (string) config('queue.default'),
                'exception' => $exception->getMessage(),
            ]);
        }

        if ($request->expectsJson()) {
            $message = $otpSent
                ? 'Pedido actualizado. Se envio un nuevo OTP al cliente.'
                : 'Pedido actualizado, pero no fue posible enviar el OTP en este momento.';

            return response()->json([
                'message' => $message,
                'otp_delivery' => $otpSent ? 'sent' : 'failed',
                'order' => [
                    'public_id' => $updatedOrder->public_id,
                    'order_number' => $updatedOrder->order_number,
                    'status' => $updatedOrder->status,
                    'customer_email' => $updatedOrder->customer_email,
                    'otp_expires_at' => $updatedOrder->otp?->expires_at,
                ],
            ]);
        }

        $statusMessage = $otpSent
            ? 'Pedido actualizado correctamente. OTP reenviado al cliente.'
            : 'Pedido actualizado, pero no fue posible enviar OTP en este momento.';

        return to_route('provider.orders.index')->with('status', $statusMessage);
    }

    public function destroy(Request $request, Order $order): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        if ($order->status !== OrderStatus::PENDING) {
            throw ValidationException::withMessages([
                'order' => 'Solo puedes eliminar pedidos pendientes.',
            ]);
        }

        $order->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Pedido eliminado correctamente.',
            ]);
        }

        return to_route('provider.orders.index')->with('status', 'Pedido eliminado correctamente.');
    }

    public function signature(Request $request, Order $order): StreamedResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        $signaturePath = $order->customer_signature_path;

        if ($signaturePath === null || ! Storage::disk('local')->exists($signaturePath)) {
            abort(404, 'La firma de esta orden no esta disponible.');
        }

        return Storage::disk('local')->response(
            $signaturePath,
            sprintf('orden-%s-firma.png', $order->public_id),
            [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'private, max-age=300',
            ],
        );
    }

    private function resolveProvider(Request $request): Provider
    {
        $provider = $request->user()?->provider;

        if (! $provider instanceof Provider) {
            abort(403, 'El usuario autenticado no tiene un proveedor asociado.');
        }

        return $provider;
    }

    private function ensureProviderOrder(Order $order, Provider $provider): void
    {
        if ($order->provider_id !== $provider->id) {
            abort(403, 'La orden no pertenece al proveedor autenticado.');
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadProviderProducts(int $providerId): array
    {
        return ProviderProduct::query()
            ->with('product')
            ->where('provider_id', $providerId)
            ->where('is_active', true)
            ->whereHas('product', fn ($query) => $query
                ->where('is_active', true))
            ->get()
            ->sortBy(fn (ProviderProduct $providerProduct): string => (string) $providerProduct->product?->name)
            ->values()
            ->map(fn (ProviderProduct $providerProduct): array => [
                'id' => $providerProduct->id,
                'product_id' => $providerProduct->product_id,
                'product_name' => $providerProduct->product?->name,
                'original_price' => (string) $providerProduct->product?->original_price,
                'default_discount_percent' => (string) $providerProduct->discount_value,
                'packaging_multiple' => max(1, (int) $providerProduct->product?->packaging_multiple),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapOrderRow(Order $order, OrderOtpService $otpService): array
    {
        $otp = $order->otp;

        return [
            'public_id' => $order->public_id,
            'order_number' => $order->order_number ?? $order->id,
            'status' => $order->status->value,
            'customer_email' => $order->customer_email,
            'subtotal_original' => (string) $order->subtotal_original,
            'subtotal_special' => (string) $order->subtotal_special,
            'total_discount' => (string) $order->total_discount,
            'created_at' => $order->created_at?->toISOString(),
            'confirmed_at' => $order->confirmed_at?->toISOString(),
            'otp_expires_at' => $otp?->expires_at?->toISOString(),
            'otp_attempts_remaining' => $otp === null ? 0 : max(0, $otp->max_attempts - $otp->attempts),
            'otp_resend_count' => $otp?->resend_count,
            'can_resend_otp' => $otp !== null
                && $otp->verified_at === null
                && in_array($order->status->value, [OrderStatus::PENDING->value, OrderStatus::EXPIRED->value], true)
                && $otpService->canResend($otp),
            'signature_url' => route('provider.orders.signature', $order),
            'can_edit' => $order->status->value === OrderStatus::PENDING->value,
            'can_delete' => $order->status->value === OrderStatus::PENDING->value,
            'items' => $order->items
                ->map(fn ($item): array => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->snapshot_product_name,
                    'quantity' => $item->quantity,
                    'unit_original_price' => (string) $item->unit_original_price,
                    'unit_special_price' => (string) $item->unit_special_price,
                    'discount_percent' => $this->resolveDiscountPercent($item->unit_original_price, $item->unit_special_price),
                    'line_special_total' => (string) $item->line_special_total,
                ])
                ->values()
                ->all(),
        ];
    }

    private function resolveDiscountPercent(float|string $unitOriginalPrice, float|string $unitSpecialPrice): string
    {
        $original = (float) $unitOriginalPrice;
        $special = (float) $unitSpecialPrice;

        if ($original <= 0) {
            return '0.00';
        }

        $discount = (($original - $special) / $original) * 100;

        return number_format(max(0, min(100, $discount)), 2, '.', '');
    }

    private function storeCustomerSignature(string $signatureData, int $providerId, string $publicId): string
    {
        $encodedSignature = Str::after($signatureData, 'data:image/png;base64,');
        $decodedSignature = base64_decode($encodedSignature, true);

        if ($decodedSignature === false) {
            throw ValidationException::withMessages([
                'customer_signature' => 'La firma del cliente no es valida.',
            ]);
        }

        $signatureMaxBytes = (int) config('orders.signature.max_bytes', 512000);

        if (strlen($decodedSignature) > $signatureMaxBytes) {
            throw ValidationException::withMessages([
                'customer_signature' => 'La firma del cliente supera el tamano permitido.',
            ]);
        }

        $signaturePath = sprintf(
            'order-signatures/provider-%d/%s-%s.png',
            $providerId,
            $publicId,
            Str::lower((string) Str::uuid()),
        );

        $stored = Storage::disk('local')->put($signaturePath, $decodedSignature);

        if (! $stored) {
            throw ValidationException::withMessages([
                'customer_signature' => 'No fue posible guardar la firma del cliente. Intenta nuevamente.',
            ]);
        }

        return $signaturePath;
    }
}
