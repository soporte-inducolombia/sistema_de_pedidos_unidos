<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DiscountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProviderProductUpsertRequest;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProviderProductManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $this->syncProviderProfilesFromUsers();

        $assignments = ProviderProduct::query()
            ->with(['provider', 'product'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (ProviderProduct $providerProduct): array => [
                'id' => $providerProduct->id,
                'provider_id' => $providerProduct->provider_id,
                'provider_name' => $providerProduct->provider?->company_name,
                'product_id' => $providerProduct->product_id,
                'product_name' => $providerProduct->product?->name,
                'product_code' => $providerProduct->product?->code,
                'product_barcode' => $providerProduct->product?->barcode,
                'product_original_price' => (string) $providerProduct->product?->original_price,
                'discount_percent' => (string) $providerProduct->discount_value,
                'special_price' => (string) $providerProduct->special_price,
                'is_active' => $providerProduct->is_active,
            ])
            ->values()
            ->all();

        $providers = Provider::query()
            ->where('is_active', true)
            ->orderBy('company_name')
            ->get(['id', 'company_name', 'user_id', 'is_active'])
            ->map(fn (Provider $provider): array => [
                'id' => $provider->id,
                'company_name' => $provider->company_name,
            ])
            ->values()
            ->all();

        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'code', 'barcode', 'name', 'original_price', 'is_active'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'code' => $product->code,
                'barcode' => $product->barcode,
                'original_price' => (string) $product->original_price,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/provider-products/index', [
            'assignments' => $assignments,
            'providers' => $providers,
            'products' => $products,
            'status' => $request->session()->get('status'),
        ]);
    }

    private function syncProviderProfilesFromUsers(): void
    {
        User::query()
            ->where('role', 'provider')
            ->whereNull('deleted_at')
            ->select(['id', 'name'])
            ->get()
            ->each(function (User $user): void {
                $provider = Provider::query()->withTrashed()->where('user_id', $user->id)->first();

                if ($provider === null) {
                    Provider::query()->create([
                        'user_id' => $user->id,
                        'company_name' => Str::limit('Proveedor '.$user->name, 255, ''),
                        'is_active' => true,
                    ]);

                    return;
                }

                if ($provider->trashed()) {
                    $provider->restore();
                }

                if (! $provider->is_active) {
                    $provider->update([
                        'is_active' => true,
                    ]);
                }
            });
    }

    public function store(ProviderProductUpsertRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $productIds = $this->resolveProductIds($validated);

        if (count($productIds) > 1) {
            $this->upsertAssignmentsForMultipleProducts($validated, $productIds);

            return to_route('admin.provider-products.index')
                ->with('status', sprintf('Se crearon %d asignaciones correctamente.', count($productIds)));
        }

        $this->upsertAssignment($validated, null, $productIds[0] ?? null);

        return to_route('admin.provider-products.index')->with('status', 'Asignacion creada correctamente.');
    }

    public function update(ProviderProductUpsertRequest $request, ProviderProduct $providerProduct): RedirectResponse
    {
        $validated = $request->validated();
        $this->upsertAssignment($validated, $providerProduct);

        return to_route('admin.provider-products.index')->with('status', 'Asignacion actualizada correctamente.');
    }

    public function destroy(ProviderProduct $providerProduct): RedirectResponse
    {
        $providerProduct->delete();

        return to_route('admin.provider-products.index')->with('status', 'Asignacion eliminada correctamente.');
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function upsertAssignment(
        array $validated,
        ?ProviderProduct $providerProduct = null,
        ?int $forcedProductId = null,
    ): void {
        DB::transaction(function () use ($validated, $providerProduct, $forcedProductId): void {
            $resolvedProductId = $forcedProductId ?? (int) $validated['product_id'];
            $product = Product::query()->lockForUpdate()->findOrFail($resolvedProductId);

            $originalPrice = isset($validated['original_price'])
                ? (float) $validated['original_price']
                : (float) $product->original_price;
            [$discountPercent, $specialPrice] = $this->resolvePricingValues($originalPrice, $validated);

            $product->update([
                'original_price' => $originalPrice,
            ]);

            $payload = [
                'provider_id' => (int) $validated['provider_id'],
                'product_id' => $product->id,
                'discount_type' => DiscountType::PERCENT->value,
                'discount_value' => $discountPercent,
                'special_price' => $specialPrice,
                'is_active' => (bool) $validated['is_active'],
            ];

            if ($providerProduct === null) {
                $existingAssignment = ProviderProduct::query()
                    ->withTrashed()
                    ->where('provider_id', (int) $validated['provider_id'])
                    ->where('product_id', $product->id)
                    ->first();

                if ($existingAssignment !== null) {
                    if ($existingAssignment->trashed()) {
                        $existingAssignment->restore();
                    }

                    $existingAssignment->update($payload);
                } else {
                    ProviderProduct::query()->create($payload);
                }
            } else {
                $providerProduct->update($payload);
            }

            $this->syncSpecialPricesForProduct(
                $product->id,
                $originalPrice,
                $providerProduct?->id,
            );
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<int, int>  $productIds
     */
    private function upsertAssignmentsForMultipleProducts(array $validated, array $productIds): void
    {
        DB::transaction(function () use ($validated, $productIds): void {
            $providerId = (int) $validated['provider_id'];
            $isActive = (bool) $validated['is_active'];

            $products = Product::query()
                ->lockForUpdate()
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            foreach ($productIds as $productId) {
                /** @var Product $product */
                $product = $products->get($productId);

                if ($product === null) {
                    continue;
                }

                $originalPrice = (float) $product->original_price;
                [$discountPercent, $specialPrice] = $this->resolvePricingValues($originalPrice, $validated);

                $payload = [
                    'provider_id' => $providerId,
                    'product_id' => $product->id,
                    'discount_type' => DiscountType::PERCENT->value,
                    'discount_value' => $discountPercent,
                    'special_price' => $specialPrice,
                    'is_active' => $isActive,
                ];

                $existingAssignment = ProviderProduct::query()
                    ->withTrashed()
                    ->where('provider_id', $providerId)
                    ->where('product_id', $product->id)
                    ->first();

                if ($existingAssignment !== null) {
                    if ($existingAssignment->trashed()) {
                        $existingAssignment->restore();
                    }

                    $existingAssignment->update($payload);
                } else {
                    ProviderProduct::query()->create($payload);
                }
            }
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<int, int>
     */
    private function resolveProductIds(array $validated): array
    {
        if (array_key_exists('product_ids', $validated) && is_array($validated['product_ids'])) {
            return array_values(array_filter(array_unique(array_map(
                static fn (mixed $productId): int => (int) $productId,
                $validated['product_ids'],
            )), static fn (int $productId): bool => $productId > 0));
        }

        if (isset($validated['product_id'])) {
            return [(int) $validated['product_id']];
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: float, 1: float}
     */
    private function resolvePricingValues(float $originalPrice, array $validated): array
    {
        $discountValue = $validated['discount_value'] ?? null;
        $specialPriceInput = $validated['special_price'] ?? null;

        if ($discountValue !== null) {
            $discountPercent = (float) $discountValue;
            $specialPrice = $this->resolveSpecialPrice($originalPrice, $discountPercent);

            return [$discountPercent, $specialPrice];
        }

        if ($specialPriceInput === null) {
            throw ValidationException::withMessages([
                'discount_value' => 'Debes indicar descuento en % o precio especial.',
            ]);
        }

        $specialPrice = round((float) $specialPriceInput, 2);
        $discountPercent = $this->resolveDiscountPercent($originalPrice, $specialPrice);

        return [$discountPercent, $specialPrice];
    }

    private function resolveSpecialPrice(float $originalPrice, float $discountPercent): float
    {
        if ($discountPercent > 100) {
            throw ValidationException::withMessages([
                'discount_value' => 'El descuento en porcentaje no puede ser mayor a 100.',
            ]);
        }

        return round($originalPrice * ((100 - $discountPercent) / 100), 2);
    }

    private function resolveDiscountPercent(float $originalPrice, float $specialPrice): float
    {
        if ($specialPrice > $originalPrice) {
            throw ValidationException::withMessages([
                'special_price' => 'El precio especial no puede ser mayor al precio original.',
            ]);
        }

        return round((($originalPrice - $specialPrice) / $originalPrice) * 100, 2);
    }

    private function syncSpecialPricesForProduct(int $productId, float $originalPrice, ?int $exceptProviderProductId = null): void
    {
        $query = ProviderProduct::query()->where('product_id', $productId);

        if ($exceptProviderProductId !== null) {
            $query->whereKeyNot($exceptProviderProductId);
        }

        $query->get()->each(function (ProviderProduct $providerProduct) use ($originalPrice): void {
            $discountPercent = (float) $providerProduct->discount_value;
            $providerProduct->update([
                'discount_type' => DiscountType::PERCENT->value,
                'special_price' => $this->resolveSpecialPrice($originalPrice, $discountPercent),
            ]);
        });
    }
}
