<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DiscountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProviderProductUpsertRequest;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProviderProductManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $assignments = ProviderProduct::query()
            ->with(['provider.user:id,email', 'product.category:id,name'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (ProviderProduct $providerProduct): array => [
                'id' => $providerProduct->id,
                'provider_id' => $providerProduct->provider_id,
                'provider_name' => $providerProduct->provider?->company_name,
                'provider_email' => $providerProduct->provider?->user?->email,
                'product_id' => $providerProduct->product_id,
                'product_name' => $providerProduct->product?->name,
                'product_sku' => $providerProduct->product?->sku,
                'product_original_price' => $providerProduct->product?->original_price,
                'category_name' => $providerProduct->product?->category?->name,
                'discount_type' => $providerProduct->discount_type?->value,
                'discount_value' => (string) $providerProduct->discount_value,
                'special_price' => (string) $providerProduct->special_price,
                'is_active' => $providerProduct->is_active,
            ])
            ->values()
            ->all();

        $providers = Provider::query()
            ->with('user:id,email')
            ->where('is_active', true)
            ->orderBy('company_name')
            ->get(['id', 'company_name', 'user_id', 'is_active'])
            ->map(fn (Provider $provider): array => [
                'id' => $provider->id,
                'company_name' => $provider->company_name,
                'user_email' => $provider->user?->email,
            ])
            ->values()
            ->all();

        $products = Product::query()
            ->with('category:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'category_id', 'sku', 'name', 'original_price', 'is_active'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category_name' => $product->category?->name,
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

    public function store(ProviderProductUpsertRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $specialPrice = $this->resolveSpecialPrice($validated);

        ProviderProduct::query()->create([
            ...$validated,
            'special_price' => $specialPrice,
        ]);

        return to_route('admin.provider-products.index')->with('status', 'Asignacion creada correctamente.');
    }

    public function update(ProviderProductUpsertRequest $request, ProviderProduct $providerProduct): RedirectResponse
    {
        $validated = $request->validated();
        $specialPrice = $this->resolveSpecialPrice($validated);

        $providerProduct->update([
            ...$validated,
            'special_price' => $specialPrice,
        ]);

        return to_route('admin.provider-products.index')->with('status', 'Asignacion actualizada correctamente.');
    }

    public function destroy(ProviderProduct $providerProduct): RedirectResponse
    {
        $providerProduct->delete();

        return to_route('admin.provider-products.index')->with('status', 'Asignacion eliminada correctamente.');
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function resolveSpecialPrice(array $validated): float
    {
        $product = Product::query()->findOrFail((int) $validated['product_id']);

        $originalPrice = (float) $product->original_price;
        $discountType = (string) $validated['discount_type'];
        $discountValue = (float) $validated['discount_value'];

        if ($discountType === DiscountType::PERCENT->value) {
            if ($discountValue > 100) {
                throw ValidationException::withMessages([
                    'discount_value' => 'El descuento en porcentaje no puede ser mayor a 100.',
                ]);
            }

            return round($originalPrice * ((100 - $discountValue) / 100), 2);
        }

        if ($discountType === DiscountType::FIXED->value) {
            if ($discountValue > $originalPrice) {
                throw ValidationException::withMessages([
                    'discount_value' => 'El descuento fijo no puede superar el precio original del producto.',
                ]);
            }

            return round(max(0, $originalPrice - $discountValue), 2);
        }

        throw ValidationException::withMessages([
            'discount_type' => 'Tipo de descuento invalido.',
        ]);
    }
}
