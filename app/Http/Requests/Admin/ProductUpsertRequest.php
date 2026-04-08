<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductUpsertRequest extends FormRequest
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
        /** @var Product|null $product */
        $product = $this->route('product');

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('products', 'code')->ignore($product)],
            'barcode' => ['required', 'string', 'max:120', Rule::unique('products', 'barcode')->ignore($product)],
            'name' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:1000'],
            'original_price' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99'],
            'packaging_multiple' => ['required', 'integer', 'min:1', 'max:999'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $code = $this->input('code');
        $barcode = $this->input('barcode');
        $name = $this->input('name');
        $description = $this->input('description');
        $packagingMultiple = $this->input('packaging_multiple');

        $this->merge([
            'code' => is_string($code) ? mb_strtoupper(trim($code)) : $code,
            'barcode' => is_string($barcode) ? trim($barcode) : $barcode,
            'name' => is_string($name) ? trim($name) : $name,
            'description' => is_string($description) ? trim($description) : $description,
            'packaging_multiple' => is_numeric($packagingMultiple)
                ? max(1, (int) $packagingMultiple)
                : $packagingMultiple,
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
