<?php

namespace App\Http\Requests\Admin;

use App\Models\Category;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryUpsertRequest extends FormRequest
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
        /** @var Category|null $category */
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('categories', 'name')->ignore($category)],
            'slug' => [
                'required',
                'string',
                'max:120',
                'alpha_dash:ascii',
                Rule::unique('categories', 'slug')->ignore($category),
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = $this->input('name');
        $slug = $this->input('slug');

        if (is_string($name)) {
            $name = trim($name);
        }

        if ((! is_string($slug) || trim($slug) === '') && is_string($name) && $name !== '') {
            $slug = Str::slug($name);
        }

        if (is_string($slug)) {
            $slug = mb_strtolower(trim($slug));
        }

        $this->merge([
            'name' => $name,
            'slug' => $slug,
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
