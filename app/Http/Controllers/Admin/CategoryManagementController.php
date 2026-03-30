<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryUpsertRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $categories = Category::query()
            ->withCount('products')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'is_active' => $category->is_active,
                'products_count' => $category->products_count,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/categories/index', [
            'categories' => $categories,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(CategoryUpsertRequest $request): RedirectResponse
    {
        Category::query()->create($request->validated());

        return to_route('admin.categories.index')->with('status', 'Categoria creada correctamente.');
    }

    public function update(CategoryUpsertRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

        return to_route('admin.categories.index')->with('status', 'Categoria actualizada correctamente.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->products()->exists()) {
            return to_route('admin.categories.index')->withErrors([
                'deleteCategory' => 'No puedes eliminar categorias con productos asociados.',
            ]);
        }

        $category->delete();

        return to_route('admin.categories.index')->with('status', 'Categoria eliminada correctamente.');
    }
}
