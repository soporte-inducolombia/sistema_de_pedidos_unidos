<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Events\OrderConfirmed;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\UpdateOrderRequest;
use App\Models\Order;
use App\Models\Provider;
use App\Models\ProviderProduct;
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

class OrderManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::query()
            ->with(['provider', 'items'])
            ->latest()
            ->get()
            ->map(fn (Order $order): array => $this->mapOrderRow($order))
            ->values()
            ->all();

        $providers = Provider::query()
            ->with(['providerProducts.product'])
            ->get()
            ->map(fn (Provider $provider): array => [
                'id' => $provider->id,
                'company_name' => $provider->company_name,
                'products' => $provider->providerProducts
                    ->where('is_active', true)
                    ->filter(fn (ProviderProduct $pp): bool => $pp->product?->is_active === true)
                    ->sortBy(fn (ProviderProduct $pp): string => (string) $pp->product?->name)
                    ->values()
                    ->map(fn (ProviderProduct $pp): array => [
                        'id' => $pp->id,
                        'product_id' => $pp->product_id,
                        'product_name' => $pp->product?->name,
                        'original_price' => (string) $pp->product?->original_price,
                        'default_discount_percent' => (string) $pp->discount_value,
                        'packaging_multiple' => max(1, (int) $pp->product?->packaging_multiple),
                    ])
                    ->all(),
            ])
            ->all();

        return Inertia::render('admin/orders/index', [
            'status' => $request->session()->get('status'),
            'orders' => $orders,
            'providers' => $providers,
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order): RedirectResponse
    {
        $provider = Provider::query()->findOrFail($order->provider_id);

        if (! in_array($order->status, [OrderStatus::PENDING, OrderStatus::CONFIRMED], true)) {
            throw ValidationException::withMessages([
                'order' => 'Solo puedes editar pedidos pendientes o confirmados.',
            ]);
        }

        $payload = $request->validated();
        $itemsByProduct = collect($payload['items'])
            ->mapWithKeys(fn (array $item): array => [
                (int) $item['product_id'] => ['quantity' => (int) $item['quantity']],
            ]);

        $providerProducts = ProviderProduct::query()
            ->with('product')
            ->where('provider_id', $provider->id)
            ->where('is_active', true)
            ->whereIn('product_id', $itemsByProduct->keys()->all())
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->get()
            ->keyBy('product_id');

        if ($providerProducts->count() !== $itemsByProduct->count()) {
            throw ValidationException::withMessages([
                'items' => 'Uno o mas productos no estan disponibles para este proveedor.',
            ]);
        }

        $newSignaturePath = null;

        if (isset($payload['customer_signature']) && is_string($payload['customer_signature'])) {
            $newSignaturePath = $this->storeCustomerSignature($payload['customer_signature'], $provider->id, $order->public_id);
        }

        $oldSignaturePath = $order->customer_signature_path;

        try {
            $updatedOrder = DB::transaction(function () use ($order, $payload, $itemsByProduct, $providerProducts, $newSignaturePath): Order {
                $lockedOrder = Order::query()
                    ->whereKey($order->id)
                    ->with(['items'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $signaturePath = $newSignaturePath ?? $lockedOrder->customer_signature_path;

                if ($signaturePath === null) {
                    throw ValidationException::withMessages([
                        'customer_signature' => 'La firma del cliente es obligatoria.',
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
                    $specialUnitInCents = max(0, (int) round($originalUnitInCents * ((100 - $discountPercent) / 100)));
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
                    'customer_email' => $payload['customer_email'] ?? $lockedOrder->customer_email,
                    'customer_signature_path' => $signaturePath,
                    'status' => OrderStatus::CONFIRMED,
                    'confirmed_at' => $lockedOrder->confirmed_at ?? now(),
                    'subtotal_original' => $subtotalOriginalInCents / 100,
                    'subtotal_special' => $subtotalSpecialInCents / 100,
                    'total_discount' => ($subtotalOriginalInCents - $subtotalSpecialInCents) / 100,
                ]);

                return $lockedOrder->fresh();
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

        try {
            event(new OrderConfirmed($updatedOrder->id));
        } catch (Throwable $exception) {
            Log::error('No fue posible despachar correos despues de editar la orden (admin).', [
                'order_id' => $updatedOrder->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        return to_route('admin.orders.index')->with('status', 'Pedido actualizado correctamente.');
    }

    public function destroy(Order $order): RedirectResponse
    {
        $order->delete();

        return to_route('admin.orders.index')->with('status', 'Pedido eliminado correctamente.');
    }

    public function signature(Order $order): StreamedResponse
    {
        $signaturePath = $order->customer_signature_path;

        if ($signaturePath === null || ! Storage::disk('local')->exists($signaturePath)) {
            abort(404, 'La firma de esta orden no esta disponible.');
        }

        return Storage::disk('local')->response(
            $signaturePath,
            sprintf('orden-%s-firma.png', $order->public_id),
            ['Content-Type' => 'image/png', 'Cache-Control' => 'private, max-age=300'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function mapOrderRow(Order $order): array
    {
        return [
            'public_id' => $order->public_id,
            'order_number' => $order->order_number ?? $order->id,
            'provider_id' => $order->provider_id,
            'provider_name' => $order->provider?->company_name,
            'status' => $order->status->value,
            'customer_email' => $order->customer_email,
            'subtotal_original' => (string) $order->subtotal_original,
            'subtotal_special' => (string) $order->subtotal_special,
            'total_discount' => (string) $order->total_discount,
            'created_at' => $order->created_at?->toISOString(),
            'confirmed_at' => $order->confirmed_at?->toISOString(),
            'signature_url' => route('admin.orders.signature', $order),
            'can_edit' => true,
            'can_delete' => true,
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

        return number_format(max(0, min(100, (($original - $special) / $original) * 100)), 2, '.', '');
    }

    private function storeCustomerSignature(string $signatureData, int $providerId, string $publicId): string
    {
        $encodedSignature = Str::after($signatureData, 'data:image/png;base64,');
        $decodedSignature = base64_decode($encodedSignature, true);

        if ($decodedSignature === false) {
            throw ValidationException::withMessages(['customer_signature' => 'La firma del cliente no es valida.']);
        }

        $signatureMaxBytes = (int) config('orders.signature.max_bytes', 512000);

        if (strlen($decodedSignature) > $signatureMaxBytes) {
            throw ValidationException::withMessages(['customer_signature' => 'La firma del cliente supera el tamano permitido.']);
        }

        $signaturePath = sprintf(
            'order-signatures/provider-%d/%s-%s.png',
            $providerId,
            $publicId,
            Str::lower((string) Str::uuid()),
        );

        if (! Storage::disk('local')->put($signaturePath, $decodedSignature)) {
            throw ValidationException::withMessages(['customer_signature' => 'No fue posible guardar la firma del cliente.']);
        }

        return $signaturePath;
    }
}
