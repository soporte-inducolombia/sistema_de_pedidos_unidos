<?php

namespace App\Http\Requests\Admin;

use App\Models\ProviderProduct;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProviderProductUpsertRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var ProviderProduct|null $providerProduct */
        $providerProduct = $this->route('providerProduct');

        $providerId = (int) $this->input('provider_id');
        $isUpdating = $providerProduct !== null;

        $baseRules = [
            'provider_id' => [
                'required',
                'integer',
                Rule::exists('providers', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'discount_value' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
                'required_without:special_price',
            ],
            'special_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
                'required_without:discount_value',
            ],
            'is_active' => ['required', 'boolean'],
        ];

        if ($isUpdating) {
            return array_merge($baseRules, [
                'product_id' => [
                    'required',
                    'integer',
                    Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
                    Rule::unique('provider_products', 'product_id')
                        ->where(fn ($query) => $query
                            ->where('provider_id', $providerId)
                            ->whereNull('deleted_at'))
                        ->ignore($providerProduct),
                ],
                'original_price' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99'],
            ]);
        }

        return array_merge($baseRules, [
            'product_id' => [
                'nullable',
                'integer',
                Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
                Rule::unique('provider_products', 'product_id')
                    ->where(fn ($query) => $query
                        ->where('provider_id', $providerId)
                        ->whereNull('deleted_at')),
            ],
            'product_ids' => ['nullable', 'array', 'min:1'],
            'product_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'original_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99'],
        ]);
    }

    protected function prepareForValidation(): void
    {
        $discountValue = $this->input('discount_value');
        $specialPrice = $this->input('special_price');
        $productIds = $this->input('product_ids');
        $normalizedProductIds = null;

        if (is_array($productIds)) {
            $normalizedProductIds = array_values(array_filter(array_map(
                static fn ($id): ?int => is_numeric($id) ? (int) $id : null,
                $productIds,
            ), static fn (?int $id): bool => $id !== null));
        }

        $this->merge([
            'product_id' => $this->input('product_id') === '' ? null : $this->input('product_id'),
            'product_ids' => $normalizedProductIds,
            'discount_value' => $discountValue === '' ? null : $discountValue,
            'special_price' => $specialPrice === '' ? null : $specialPrice,
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $hasDiscountValue = $this->filled('discount_value');
            $hasSpecialPrice = $this->filled('special_price');
            /** @var ProviderProduct|null $providerProduct */
            $providerProduct = $this->route('providerProduct');

            if ($hasDiscountValue && $hasSpecialPrice) {
                $message = 'Debes indicar solo uno: descuento % o precio especial.';
                $validator->errors()->add('discount_value', $message);
                $validator->errors()->add('special_price', $message);
            }

            if ($providerProduct !== null) {
                return;
            }

            $hasSingleProduct = $this->filled('product_id');
            $productIds = collect($this->input('product_ids', []))
                ->filter(static fn ($id): bool => is_numeric($id) && (int) $id > 0)
                ->map(static fn ($id): int => (int) $id)
                ->values();

            if ($hasSingleProduct && $productIds->isNotEmpty()) {
                $message = 'Selecciona un producto individual o varios productos, no ambos.';
                $validator->errors()->add('product_id', $message);
                $validator->errors()->add('product_ids', $message);

                return;
            }

            if (! $hasSingleProduct && $productIds->isEmpty()) {
                $validator->errors()->add('product_ids', 'Debes seleccionar al menos un producto.');

                return;
            }

            $resolvedProductIds = $hasSingleProduct
                ? collect([(int) $this->input('product_id')])
                : $productIds;

            if ($resolvedProductIds->count() > 1 && $hasSpecialPrice) {
                $validator->errors()->add(
                    'special_price',
                    'Para asignaciones masivas debes usar descuento en porcentaje.',
                );
            }

            $providerId = (int) $this->input('provider_id');

            if ($providerId <= 0 || $resolvedProductIds->isEmpty()) {
                return;
            }

            $alreadyAssignedProducts = ProviderProduct::query()
                ->where('provider_id', $providerId)
                ->whereIn('product_id', $resolvedProductIds->all())
                ->pluck('product_id');

            if ($alreadyAssignedProducts->isNotEmpty()) {
                $validator->errors()->add(
                    'product_ids',
                    'Uno o mas productos ya estan asignados a este proveedor.',
                );
            }
        });
    }
}
