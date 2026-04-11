<?php

namespace App\Http\Requests\Orders;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_user_id' => [
                'nullable',
                'integer',
                Rule::exists((new User)->getTable(), 'id')->where(
                    fn ($query) => $query
                        ->whereIn('role', ['cliente', 'client'])
                        ->whereNull('deleted_at'),
                ),
            ],
            'customer_email' => ['nullable', 'email:rfc'],
            'customer_signature' => [
                'required',
                'string',
                'starts_with:data:image/png;base64,',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value)) {
                        $fail('La firma del cliente no es valida.');

                        return;
                    }

                    $encodedSignature = Str::after($value, 'data:image/png;base64,');

                    if ($encodedSignature === '' || base64_decode($encodedSignature, true) === false) {
                        $fail('La firma del cliente no es valida.');
                    }
                },
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'items.*.discount_percent' => ['sometimes', 'numeric', 'between:0,100'],
        ];
    }
}
