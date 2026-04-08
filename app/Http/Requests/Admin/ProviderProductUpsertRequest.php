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
            ],
            'special_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
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
                        ->where(fn ($query) => $query->whereNull('deleted_at'))
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
                    ->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'product_ids' => ['nullable', 'array', 'min:1'],
            'product_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'product_discounts' => ['nullable', 'array', 'min:1'],
            'product_discounts.*.product_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'product_discounts.*.discount_value' => ['required', 'numeric', 'min:0', 'max:100'],
            'original_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99'],
        ]);
    }

    protected function prepareForValidation(): void
    {
        $discountValue = $this->input('discount_value');
        $specialPrice = $this->input('special_price');
        $productIds = $this->input('product_ids');
        $productDiscounts = $this->input('product_discounts');
        $normalizedProductIds = null;
        $normalizedProductDiscounts = null;

        if (is_array($productIds)) {
            $normalizedProductIds = array_values(array_filter(array_map(
                static fn ($id): ?int => is_numeric($id) ? (int) $id : null,
                $productIds,
            ), static fn (?int $id): bool => $id !== null));
        }

        if (is_array($productDiscounts)) {
            $normalizedProductDiscounts = array_values(array_filter(array_map(
                static function ($entry): ?array {
                    if (! is_array($entry)) {
                        return null;
                    }

                    $productId = $entry['product_id'] ?? null;

                    if (! is_numeric($productId)) {
                        return null;
                    }

                    $discountValue = $entry['discount_value'] ?? null;

                    return [
                        'product_id' => (int) $productId,
                        'discount_value' => $discountValue === '' ? null : $discountValue,
                    ];
                },
                $productDiscounts,
            ), static fn (?array $entry): bool => $entry !== null));
        }

        $this->merge([
            'product_id' => $this->input('product_id') === '' ? null : $this->input('product_id'),
            'product_ids' => $normalizedProductIds,
            'product_discounts' => $normalizedProductDiscounts,
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
                if (! $hasDiscountValue && ! $hasSpecialPrice) {
                    $validator->errors()->add('discount_value', 'Debes indicar descuento en % o precio especial.');
                }

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

            if (! $hasDiscountValue && ! $hasSpecialPrice && $resolvedProductIds->count() === 1) {
                $validator->errors()->add('discount_value', 'Debes indicar descuento en % o precio especial.');

                return;
            }

            if ($resolvedProductIds->count() > 1 && $hasSpecialPrice) {
                $validator->errors()->add(
                    'special_price',
                    'Para asignaciones masivas debes usar descuento en porcentaje.',
                );
            }

            $productDiscountRows = collect($this->input('product_discounts', []))
                ->filter(static fn ($entry): bool => is_array($entry));

            if ($resolvedProductIds->count() > 1 && ! $hasDiscountValue && $productDiscountRows->isEmpty()) {
                $validator->errors()->add(
                    'product_discounts',
                    'Debes indicar un descuento en porcentaje por producto o un descuento global.',
                );

                return;
            }

            if ($resolvedProductIds->count() > 1 && $productDiscountRows->isNotEmpty()) {
                $discountProductIds = $productDiscountRows
                    ->map(static fn (array $entry): int => (int) ($entry['product_id'] ?? 0))
                    ->filter(static fn (int $productId): bool => $productId > 0)
                    ->values();

                $missingProductIds = $resolvedProductIds->diff($discountProductIds);

                if ($missingProductIds->isNotEmpty()) {
                    $validator->errors()->add(
                        'product_discounts',
                        'Debes indicar un descuento para cada producto seleccionado.',
                    );
                }

                $unknownProductIds = $discountProductIds->diff($resolvedProductIds);

                if ($unknownProductIds->isNotEmpty()) {
                    $validator->errors()->add(
                        'product_discounts',
                        'Hay descuentos para productos no seleccionados.',
                    );
                }
            }

            if ($resolvedProductIds->isEmpty()) {
                return;
            }

            $alreadyAssignedProducts = ProviderProduct::query()
                ->whereIn('product_id', $resolvedProductIds->all())
                ->pluck('product_id');

            if ($alreadyAssignedProducts->isNotEmpty()) {
                $validator->errors()->add(
                    'product_ids',
                    'Uno o mas productos ya estan asignados a otro proveedor.',
                );
            }
        });
    }
}
