<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RecycleBinManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $items = collect()
            ->merge($this->trashedUsers())
            ->merge($this->trashedProducts())
            ->merge($this->trashedProviderProducts())
            ->merge($this->trashedRoles())
            ->merge($this->trashedCategories())
            ->merge($this->trashedOrders())
            ->sortByDesc('deleted_at')
            ->values()
            ->all();

        return Inertia::render('admin/recycle-bin/index', [
            'items' => $items,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function restore(string $entity, int $id): RedirectResponse
    {
        try {
            match ($entity) {
                'users' => $this->restoreUser($id),
                'products' => $this->restoreProduct($id),
                'provider-products' => $this->restoreProviderProduct($id),
                'roles' => $this->restoreRole($id),
                'categories' => $this->restoreCategory($id),
                'orders' => $this->restoreOrder($id),
                default => throw ValidationException::withMessages([
                    'restore' => 'Tipo de elemento no soportado para restauracion.',
                ]),
            };
        } catch (ValidationException $exception) {
            return to_route('admin.recycle-bin.index')->withErrors($exception->errors());
        } catch (ModelNotFoundException) {
            return to_route('admin.recycle-bin.index')->withErrors([
                'restore' => 'No se encontro el elemento solicitado en la papelera.',
            ]);
        }

        return to_route('admin.recycle-bin.index')->with('status', 'Elemento restaurado correctamente.');
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedUsers(): Collection
    {
        return User::query()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (User $user): array => [
                'entity' => 'users',
                'entity_label' => 'Usuario',
                'id' => $user->id,
                'title' => $user->name,
                'subtitle' => sprintf('@%s | %s', (string) $user->username, $user->role),
                'deleted_at' => $user->deleted_at?->toISOString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedProducts(): Collection
    {
        return Product::query()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Product $product): array => [
                'entity' => 'products',
                'entity_label' => 'Producto',
                'id' => $product->id,
                'title' => $product->name,
                'subtitle' => sprintf('Codigo: %s | Barras: %s', $product->code, $product->barcode),
                'deleted_at' => $product->deleted_at?->toISOString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedProviderProducts(): Collection
    {
        return ProviderProduct::query()
            ->onlyTrashed()
            ->with([
                'provider' => fn ($query) => $query->withTrashed(),
                'product' => fn ($query) => $query->withTrashed(),
            ])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (ProviderProduct $providerProduct): array => [
                'entity' => 'provider-products',
                'entity_label' => 'Asignacion',
                'id' => $providerProduct->id,
                'title' => (string) ($providerProduct->provider?->company_name ?? 'Proveedor sin nombre'),
                'subtitle' => (string) ($providerProduct->product?->name ?? 'Producto sin nombre'),
                'deleted_at' => $providerProduct->deleted_at?->toISOString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedRoles(): Collection
    {
        return Role::query()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Role $role): array => [
                'entity' => 'roles',
                'entity_label' => 'Rol',
                'id' => $role->id,
                'title' => $role->name,
                'subtitle' => $role->slug,
                'deleted_at' => $role->deleted_at?->toISOString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedCategories(): Collection
    {
        return Category::query()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Category $category): array => [
                'entity' => 'categories',
                'entity_label' => 'Categoria',
                'id' => $category->id,
                'title' => $category->name,
                'subtitle' => $category->slug,
                'deleted_at' => $category->deleted_at?->toISOString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function trashedOrders(): Collection
    {
        return Order::query()
            ->onlyTrashed()
            ->with([
                'provider' => fn ($query) => $query->withTrashed(),
            ])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Order $order): array => [
                'entity' => 'orders',
                'entity_label' => 'Pedido',
                'id' => $order->id,
                'title' => sprintf(
                    'Pedido Nro %s',
                    (string) ($order->order_number ?? $order->id),
                ),
                'subtitle' => sprintf(
                    '%s | %s',
                    (string) ($order->provider?->company_name ?? 'Proveedor sin nombre'),
                    $order->customer_email,
                ),
                'deleted_at' => $order->deleted_at?->toISOString(),
            ]);
    }

    private function restoreUser(int $id): void
    {
        /** @var User $user */
        $user = User::query()->withTrashed()->findOrFail($id);

        DB::transaction(function () use ($user): void {
            if ($user->trashed()) {
                $user->restore();
            }

            $provider = Provider::query()->withTrashed()->where('user_id', $user->id)->first();

            if ($provider === null) {
                return;
            }

            if ($provider->trashed()) {
                $provider->restore();
            }

            ProviderProduct::query()
                ->withTrashed()
                ->where('provider_id', $provider->id)
                ->restore();
        });
    }

    private function restoreProduct(int $id): void
    {
        /** @var Product $product */
        $product = Product::query()->withTrashed()->findOrFail($id);
        $product->restore();
    }

    private function restoreProviderProduct(int $id): void
    {
        /** @var ProviderProduct $providerProduct */
        $providerProduct = ProviderProduct::query()->withTrashed()->findOrFail($id);

        $provider = Provider::query()->withTrashed()->find($providerProduct->provider_id);
        $product = Product::query()->withTrashed()->find($providerProduct->product_id);

        if ($provider === null || $provider->trashed()) {
            throw ValidationException::withMessages([
                'restore' => 'No puedes restaurar la asignacion porque el proveedor sigue eliminado.',
            ]);
        }

        if ($product === null || $product->trashed()) {
            throw ValidationException::withMessages([
                'restore' => 'No puedes restaurar la asignacion porque el producto sigue eliminado.',
            ]);
        }

        $providerProduct->restore();
    }

    private function restoreRole(int $id): void
    {
        /** @var Role $role */
        $role = Role::query()->withTrashed()->findOrFail($id);
        $role->restore();
    }

    private function restoreCategory(int $id): void
    {
        /** @var Category $category */
        $category = Category::query()->withTrashed()->findOrFail($id);
        $category->restore();
    }

    private function restoreOrder(int $id): void
    {
        /** @var Order $order */
        $order = Order::query()->withTrashed()->findOrFail($id);

        $provider = Provider::query()->withTrashed()->find($order->provider_id);

        if ($provider === null || $provider->trashed()) {
            throw ValidationException::withMessages([
                'restore' => 'No puedes restaurar el pedido porque su proveedor sigue eliminado.',
            ]);
        }

        $order->restore();
    }
}
