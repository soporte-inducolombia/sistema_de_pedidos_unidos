<?php

namespace App\Http\Controllers\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderConfirmed;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\VerifyOrderOtpRequest;
use App\Jobs\SendOrderOtpMailJob;
use App\Models\Order;
use App\Models\Provider;
use App\Services\OrderOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class OrderOtpVerificationController extends Controller
{
    public function store(VerifyOrderOtpRequest $request, Order $order, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        $payload = $request->validated();

        $result = DB::transaction(function () use ($order, $provider, $payload, $otpService): array {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with('otp')
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureProviderOrder($lockedOrder, $provider);

            if ($lockedOrder->status !== OrderStatus::PENDING) {
                return [
                    'ok' => false,
                    'errors' => [
                        'order' => 'Solo se pueden confirmar ordenes pendientes.',
                    ],
                ];
            }

            $otp = $lockedOrder->otp;

            if ($otp === null) {
                return [
                    'ok' => false,
                    'errors' => [
                        'code' => 'La orden no tiene un codigo OTP activo.',
                    ],
                ];
            }

            if ($otp->verified_at !== null) {
                return [
                    'ok' => false,
                    'errors' => [
                        'code' => 'El codigo OTP ya fue utilizado.',
                    ],
                ];
            }

            if ($otp->isExpired()) {
                $lockedOrder->update([
                    'status' => OrderStatus::EXPIRED,
                ]);

                return [
                    'ok' => false,
                    'errors' => [
                        'code' => 'El codigo OTP expiro. Solicita uno nuevo.',
                    ],
                ];
            }

            if (! $otp->canAttempt()) {
                return [
                    'ok' => false,
                    'errors' => [
                        'code' => 'Se supero el maximo de intentos permitidos.',
                    ],
                ];
            }

            $otp->increment('attempts');
            $otp->refresh();

            if (! $otpService->isValid($otp, $payload['code'])) {
                return [
                    'ok' => false,
                    'errors' => [
                        'code' => 'Codigo OTP invalido.',
                    ],
                ];
            }

            $otp->forceFill([
                'verified_at' => now(),
            ])->save();

            $lockedOrder->forceFill([
                'status' => OrderStatus::CONFIRMED,
                'confirmed_at' => now(),
            ])->save();

            return [
                'ok' => true,
                'order_id' => $lockedOrder->id,
            ];
        });

        if (! ($result['ok'] ?? false)) {
            throw ValidationException::withMessages($result['errors'] ?? ['code' => 'No fue posible validar el OTP.']);
        }

        $confirmedOrderId = (int) $result['order_id'];

        $postConfirmationQueued = true;

        try {
            event(new OrderConfirmed($confirmedOrderId));
        } catch (Throwable $exception) {
            $postConfirmationQueued = false;

            Log::error('La orden se confirmo, pero fallo el despacho de correos/postprocesos.', [
                'order_id' => $confirmedOrderId,
                'queue_connection' => (string) config('queue.default'),
                'exception' => $exception->getMessage(),
            ]);
        }

        $confirmedOrder = Order::query()
            ->with(['items', 'provider.user'])
            ->findOrFail($confirmedOrderId);

        if ($request->expectsJson()) {
            $message = $postConfirmationQueued
                ? 'Orden confirmada correctamente.'
                : 'Orden confirmada, pero no fue posible despachar correos de confirmacion en este momento.';

            return response()->json([
                'message' => $message,
                'post_confirmation_delivery' => $postConfirmationQueued ? 'queued' : 'failed',
                'order' => [
                    'public_id' => $confirmedOrder->public_id,
                    'status' => $confirmedOrder->status,
                    'confirmed_at' => $confirmedOrder->confirmed_at,
                    'customer_email' => $confirmedOrder->customer_email,
                    'provider_email' => $confirmedOrder->provider?->user?->email,
                ],
            ]);
        }

        $statusMessage = $postConfirmationQueued
            ? 'Orden confirmada correctamente.'
            : 'Orden confirmada, pero no fue posible despachar correos de confirmacion en este momento.';

        return to_route('provider.orders.index')->with('status', $statusMessage);
    }

    public function resend(Request $request, Order $order, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        $otpCode = $otpService->generateCode();

        $orderWithOtp = DB::transaction(function () use ($order, $provider, $otpService): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with('otp')
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureProviderOrder($lockedOrder, $provider);

            if (! in_array($lockedOrder->status, [OrderStatus::PENDING, OrderStatus::EXPIRED], true)) {
                throw ValidationException::withMessages([
                    'order' => 'Solo se puede reenviar OTP en ordenes pendientes o expiradas.',
                ]);
            }

            $otp = $lockedOrder->otp;

            if ($otp === null || $otp->verified_at !== null) {
                throw ValidationException::withMessages([
                    'code' => 'La orden no tiene un OTP reenviable.',
                ]);
            }

            if (! $otpService->canResend($otp)) {
                throw ValidationException::withMessages([
                    'code' => 'Aun no es posible reenviar OTP o ya se alcanzo el limite de reenvios.',
                ]);
            }

            return $lockedOrder->fresh('otp');
        });

        try {
            SendOrderOtpMailJob::dispatch($orderWithOtp->id, (string) $otpCode)
                ->onQueue((string) config('orders.queues.otp', 'mails'))
                ->afterCommit();
        } catch (Throwable $exception) {
            Log::error('No fue posible despachar el reenvio de OTP.', [
                'order_id' => $orderWithOtp->id,
                'queue_connection' => (string) config('queue.default'),
                'exception' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'code' => 'No fue posible reenviar OTP en este momento. Intenta nuevamente en unos minutos.',
            ]);
        }

        $updatedOrder = DB::transaction(function () use ($orderWithOtp, $provider, $otpService, $otpCode): Order {
            $lockedOrder = Order::query()
                ->whereKey($orderWithOtp->id)
                ->with('otp')
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureProviderOrder($lockedOrder, $provider);

            if (! in_array($lockedOrder->status, [OrderStatus::PENDING, OrderStatus::EXPIRED], true)) {
                throw ValidationException::withMessages([
                    'order' => 'Solo se puede reenviar OTP en ordenes pendientes o expiradas.',
                ]);
            }

            $otp = $lockedOrder->otp;

            if ($otp === null || $otp->verified_at !== null) {
                throw ValidationException::withMessages([
                    'code' => 'La orden no tiene un OTP reenviable.',
                ]);
            }

            if (! $otpService->canResend($otp)) {
                throw ValidationException::withMessages([
                    'code' => 'Aun no es posible reenviar OTP o ya se alcanzo el limite de reenvios.',
                ]);
            }

            $otp->forceFill([
                'code_hash' => $otpService->hashCode($otpCode),
                'expires_at' => $otpService->expiration(),
                'attempts' => 0,
                'resend_count' => $otp->resend_count + 1,
                'last_sent_at' => now(),
            ])->save();

            $lockedOrder->forceFill([
                'status' => OrderStatus::PENDING,
            ])->save();

            return $lockedOrder->fresh('otp');
        });

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'OTP reenviado al correo del cliente.',
                'order' => [
                    'public_id' => $updatedOrder->public_id,
                    'otp_expires_at' => $updatedOrder->otp?->expires_at,
                ],
            ]);
        }

        return to_route('provider.orders.index')->with([
            'status' => 'OTP reenviado al correo del cliente.',
            'pending_otp_order_public_id' => $updatedOrder->public_id,
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

    private function ensureProviderOrder(Order $order, Provider $provider): void
    {
        if ($order->provider_id !== $provider->id) {
            abort(403, 'La orden no pertenece al proveedor autenticado.');
        }
    }
}
