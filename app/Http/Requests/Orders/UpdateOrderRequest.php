<?php

namespace App\Http\Requests\Orders;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class UpdateOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_email' => ['required', 'email:rfc'],
            'customer_signature' => [
                'nullable',
                'string',
                'starts_with:data:image/png;base64,',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null) {
                        return;
                    }

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
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }
}
