<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductUpsertRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->withCount('providerProducts')
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'code' => $product->code,
                'barcode' => $product->barcode,
                'name' => $product->name,
                'description' => $product->description,
                'original_price' => (string) $product->original_price,
                'is_active' => $product->is_active,
                'provider_products_count' => $product->provider_products_count,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/products/index', [
            'products' => $products,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(ProductUpsertRequest $request): RedirectResponse
    {
        Product::query()->create($request->validated());

        return to_route('admin.products.index')->with('status', 'Producto creado correctamente.');
    }

    public function update(ProductUpsertRequest $request, Product $product): RedirectResponse
    {
        $product->update($request->validated());

        return to_route('admin.products.index')->with('status', 'Producto actualizado correctamente.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        if ($product->providerProducts()->exists()) {
            return to_route('admin.products.index')->withErrors([
                'deleteProduct' => 'No puedes eliminar productos asignados a proveedores.',
            ]);
        }

        $product->delete();

        return to_route('admin.products.index')->with('status', 'Producto eliminado correctamente.');
    }
}
