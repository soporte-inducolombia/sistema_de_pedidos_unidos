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
use Illuminate\Validation\ValidationException;

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

        event(new OrderConfirmed($confirmedOrderId));

        $confirmedOrder = Order::query()
            ->with(['items', 'provider.user'])
            ->findOrFail($confirmedOrderId);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Orden confirmada correctamente.',
                'order' => [
                    'public_id' => $confirmedOrder->public_id,
                    'status' => $confirmedOrder->status,
                    'confirmed_at' => $confirmedOrder->confirmed_at,
                    'customer_email' => $confirmedOrder->customer_email,
                    'provider_email' => $confirmedOrder->provider?->user?->email,
                ],
            ]);
        }

        return to_route('dashboard')->with('status', 'Orden confirmada correctamente.');
    }

    public function resend(Request $request, Order $order, OrderOtpService $otpService): JsonResponse|RedirectResponse
    {
        $provider = $this->resolveProvider($request);
        $this->ensureProviderOrder($order, $provider);

        $otpCode = null;

        $orderWithOtp = DB::transaction(function () use ($order, $provider, $otpService, &$otpCode): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with('otp')
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureProviderOrder($lockedOrder, $provider);

            if ($lockedOrder->status !== OrderStatus::PENDING) {
                throw ValidationException::withMessages([
                    'order' => 'Solo se puede reenviar OTP en ordenes pendientes.',
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

            $otpCode = $otpService->generateCode();

            $otp->forceFill([
                'code_hash' => $otpService->hashCode($otpCode),
                'expires_at' => $otpService->expiration(),
                'attempts' => 0,
                'resend_count' => $otp->resend_count + 1,
                'last_sent_at' => now(),
            ])->save();

            return $lockedOrder->fresh('otp');
        });

        SendOrderOtpMailJob::dispatch($orderWithOtp->id, (string) $otpCode)
            ->onQueue((string) config('orders.queues.otp', 'mails'))
            ->afterCommit();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'OTP reenviado al correo del cliente.',
                'order' => [
                    'public_id' => $orderWithOtp->public_id,
                    'otp_expires_at' => $orderWithOtp->otp?->expires_at,
                ],
            ]);
        }

        return to_route('dashboard')->with('status', 'OTP reenviado al correo del cliente.');
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
