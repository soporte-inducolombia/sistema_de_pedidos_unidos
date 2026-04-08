<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserUpdateRequest extends FormRequest
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
        /** @var User $user */
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'required_unless:role,cliente,client', 'string', 'max:255', 'alpha_dash', Rule::unique(User::class, 'username')->ignore($user)],
            'role' => ['required', 'string', 'max:50', Rule::exists('roles', 'slug')],
            'email' => ['nullable', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')->ignore($user)],
            'nit' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:30'],
            'business_name' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:255'],
            'supermarket_name' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:120'],
            'department' => ['nullable', 'required_if:role,cliente,client', 'string', 'max:120'],
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $password = $this->input('password');

        $this->merge([
            'username' => $this->input('username') === '' ? null : $this->input('username'),
            'password' => $password === '' ? null : $password,
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
