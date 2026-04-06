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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class OrderController extends Controller
{
    public function create(Request $request): Response
    {
        $provider = $this->resolveProvider($request);

        $providerProducts = ProviderProduct::query()
            ->with('product')
            ->where('provider_id', $provider->id)
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
                'code' => $providerProduct->product?->code,
                'barcode' => $providerProduct->product?->barcode,
                'special_price' => (string) $providerProduct->special_price,
                'discount_percent' => (string) $providerProduct->discount_value,
            ])
            ->all();

        return Inertia::render('provider/orders/create', [
            'status' => $request->session()->get('status'),
            'providerWorkspace' => [
                'provider' => [
                    'company_name' => $provider->company_name,
                    'stand_label' => $provider->stand_label,
                ],
                'products' => $providerProducts,
            ],
        ]);
    }

    public function store(StoreOrderRequest $request, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);

        $payload = $request->validated();
        $itemsByProduct = collect($payload['items'])
            ->mapWithKeys(fn (array $item): array => [(int) $item['product_id'] => (int) $item['quantity']]);

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

        $otpCode = $otpService->generateCode();
        $publicId = (string) Str::uuid();
        $signaturePath = $this->storeCustomerSignature(
            $payload['customer_signature'],
            $provider->id,
            $publicId,
        );

        try {
            $order = DB::transaction(function () use ($payload, $provider, $providerProducts, $itemsByProduct, $otpCode, $otpService, $publicId, $signaturePath): Order {
                $nextOrderNumber = ((int) Order::query()
                    ->withTrashed()
                    ->where('provider_id', $provider->id)
                    ->lockForUpdate()
                    ->max('order_number')) + 1;

                $order = Order::query()->create([
                    'public_id' => $publicId,
                    'order_number' => $nextOrderNumber,
                    'provider_id' => $provider->id,
                    'customer_email' => $payload['customer_email'],
                    'customer_signature_path' => $signaturePath,
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
                        'snapshot_sku' => $providerProduct->product->code,
                        'snapshot_category_name' => null,
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
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($signaturePath);

            throw $exception;
        }

        $otpSent = true;

        try {
            SendOrderOtpMailJob::dispatch($order->id, $otpCode)
                ->onQueue((string) config('orders.queues.otp', 'mails'))
                ->afterCommit();
        } catch (Throwable $exception) {
            $otpSent = false;

            Log::error('No fue posible despachar el correo OTP para la orden.', [
                'order_id' => $order->id,
                'customer_email' => $order->customer_email,
                'queue_connection' => (string) config('queue.default'),
                'exception' => $exception->getMessage(),
            ]);
        }

        if ($request->expectsJson()) {
            $message = $otpSent
                ? 'Orden generada en estado pendiente. OTP enviado al cliente.'
                : 'Orden generada en estado pendiente, pero no fue posible enviar OTP en este momento. Intenta reenviarlo.';

            return response()->json([
                'message' => $message,
                'otp_delivery' => $otpSent ? 'sent' : 'failed',
                'order' => [
                    'public_id' => $order->public_id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'customer_email' => $order->customer_email,
                    'subtotal_original' => $order->subtotal_original,
                    'subtotal_special' => $order->subtotal_special,
                    'total_discount' => $order->total_discount,
                    'otp_expires_at' => $order->otp?->expires_at,
                ],
            ], $otpSent ? 201 : 202);
        }

        $statusMessage = $otpSent
            ? 'Orden generada correctamente. OTP enviado al cliente.'
            : 'Orden generada correctamente, pero no fue posible enviar OTP. Intenta reenviarlo desde Pedidos.';

        return to_route('provider.orders.index')->with([
            'status' => $statusMessage,
            'pending_otp_order_public_id' => $order->public_id,
        ]);
    }

    private function resolveProvider(Request $request): Provider
    {
        $provider = $request->user()?->provider;

        if (! $provider instanceof Provider) {
            abort(403, 'El usuario autenticado no tiene un proveedor asociado.');
        }

        return $provider;
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
            'order-signatures/provider-%d/%s.png',
            $providerId,
            $publicId,
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
