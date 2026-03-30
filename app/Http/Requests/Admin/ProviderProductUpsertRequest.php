<?php

namespace App\Http\Requests\Admin;

use App\Enums\DiscountType;
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

        return [
            'provider_id' => ['required', 'integer', Rule::exists('providers', 'id')],
            'product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id'),
                Rule::unique('provider_products', 'product_id')
                    ->where(fn ($query) => $query->where('provider_id', $providerId))
                    ->ignore($providerProduct),
            ],
            'discount_type' => ['required', 'string', Rule::in(array_map(
                static fn (DiscountType $discountType): string => $discountType->value,
                DiscountType::cases(),
            ))],
            'discount_value' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $discountType = $this->input('discount_type');

        $this->merge([
            'discount_type' => is_string($discountType) ? mb_strtolower(trim($discountType)) : $discountType,
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
