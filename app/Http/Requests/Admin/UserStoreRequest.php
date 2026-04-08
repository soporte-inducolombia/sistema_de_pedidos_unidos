<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserStoreRequest extends FormRequest
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
        return [
            'name' => ['nullable', 'required_unless:role,cliente,client', 'string', 'max:255'],
            'username' => ['nullable', 'required_unless:role,cliente,client', 'string', 'max:255', 'alpha_dash', Rule::unique(User::class, 'username')],
            'role' => ['required', 'string', 'max:50', Rule::exists('roles', 'slug')],
            'password' => ['nullable', 'required_unless:role,cliente,client', 'string', Password::default(), 'confirmed'],
            'email' => ['nullable', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')],
            'nit' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:30'],
            'business_name' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:255'],
            'supermarket_name' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:120'],
            'department' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:120'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->input('name') === '' ? null : $this->input('name'),
            'username' => $this->input('username') === '' ? null : $this->input('username'),
            'password' => $this->input('password') === '' ? null : $this->input('password'),
            'email' => $this->input('email') === '' ? null : $this->input('email'),
            'nit' => $this->input('nit') === '' ? null : $this->input('nit'),
            'business_name' => $this->input('business_name') === '' ? null : $this->input('business_name'),
            'supermarket_name' => $this->input('supermarket_name') === '' ? null : $this->input('supermarket_name'),
            'address' => $this->input('address') === '' ? null : $this->input('address'),
            'city' => $this->input('city') === '' ? null : $this->input('city'),
            'department' => $this->input('department') === '' ? null : $this->input('department'),
        ]);
    }
}
