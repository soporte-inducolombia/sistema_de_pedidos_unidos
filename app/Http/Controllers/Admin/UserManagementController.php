<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserStoreRequest;
use App\Http\Requests\Admin\UserUpdateRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Show users administration page.
     */
    public function index(Request $request): Response
    {
        $users = User::query()
            ->select([
                'id',
                'name',
                'email',
                'username',
                'role',
                'nit',
                'business_name',
                'supermarket_name',
                'address',
                'city',
                'department',
                'created_at',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $user->role,
                'nit' => $user->nit,
                'business_name' => $user->business_name,
                'supermarket_name' => $user->supermarket_name,
                'address' => $user->address,
                'city' => $user->city,
                'department' => $user->department,
                'created_at' => $user->created_at?->toISOString(),
            ])
            ->values()
            ->all();

        $roles = Role::query()
            ->orderBy('name')
            ->pluck('slug')
            ->values()
            ->all();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Create a user from administration module.
     */
    public function store(UserStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if ($this->isCustomerRole((string) ($validated['role'] ?? ''))) {
            if (! isset($validated['name']) || $validated['name'] === null || trim((string) $validated['name']) === '') {
                $validated['name'] = $this->generateCustomerDisplayName($validated);
            }

            if (! isset($validated['username']) || $validated['username'] === null) {
                $validated['username'] = $this->generateCustomerUsername($validated);
            }

            if (! isset($validated['password']) || $validated['password'] === null) {
                $validated['password'] = Str::random(32);
            }
        }

        $user = User::query()->create($validated);

        $this->syncProviderProfile($user, '');

        return to_route('admin.users.index')->with('status', 'Usuario registrado correctamente.');
    }

    /**
     * Update a user and its role.
     */
    public function update(UserUpdateRequest $request, User $user): RedirectResponse
    {
        $previousRole = $user->role;
        $validated = $request->validated();

        if ($this->isCustomerRole((string) ($validated['role'] ?? $user->role))) {
            if (! isset($validated['username']) || $validated['username'] === null) {
                $validated['username'] = ($user->username !== null && $user->username !== '')
                    ? $user->username
                    : $this->generateCustomerUsername([
                        ...$validated,
                        'name' => $validated['name'] ?? $user->name,
                    ]);
            }
        }

        if (($validated['password'] ?? null) === null) {
            unset($validated['password']);
        }

        $user->fill($validated);
        $user->save();

        $this->syncProviderProfile($user, $previousRole);

        return to_route('admin.users.index')->with('status', 'Usuario actualizado correctamente.');
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->is($user)) {
            return to_route('admin.users.index')->withErrors([
                'delete' => 'No puedes eliminar tu propio usuario.',
            ]);
        }

        $provider = $user->provider()->withTrashed()->first();
        $hasProviderOrders = $provider?->orders()->withTrashed()->exists() ?? false;

        if ($hasProviderOrders) {
            return to_route('admin.users.index')->withErrors([
                'delete' => 'No se puede eliminar este usuario porque su proveedor tiene pedidos registrados.',
            ]);
        }

        DB::transaction(function () use ($user, $provider): void {
            if ($provider !== null) {
                $provider->providerProducts()->delete();
                $provider->delete();
            }

            $user->delete();
        });

        return to_route('admin.users.index')->with('status', 'Usuario eliminado correctamente.');
    }

    private function syncProviderProfile(User $user, string $previousRole): void
    {
        if ($this->isProviderRole($user->role)) {
            $provider = $user->provider;

            if ($provider === null) {
                $user->provider()->create([
                    'company_name' => Str::limit('Proveedor '.$user->name, 255, ''),
                    'is_active' => true,
                ]);

                return;
            }

            if (! $provider->is_active) {
                $provider->update([
                    'is_active' => true,
                ]);
            }

            return;
        }

        if ($this->isProviderRole($previousRole) && $user->provider !== null && $user->provider->is_active) {
            $user->provider->update([
                'is_active' => false,
            ]);
        }
    }

    private function isProviderRole(string $role): bool
    {
        return in_array($role, ['provider', 'proveedor'], true);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function generateCustomerUsername(array $validated): string
    {
        $baseSource = (string) (
            $validated['supermarket_name']
            ?? $validated['business_name']
            ?? $validated['name']
            ?? 'cliente'
        );

        $base = Str::of($baseSource)
            ->lower()
            ->ascii()
            ->replaceMatches('/[^a-z0-9_]+/', '_')
            ->trim('_')
            ->value();

        if ($base === '') {
            $base = 'cliente';
        }

        $base = Str::limit($base, 40, '');
        $candidate = $base;
        $suffix = 0;

        while (User::query()->where('username', $candidate)->exists()) {
            $suffix++;
            $suffixText = '_'.$suffix;
            $candidate = Str::limit($base, 40 - strlen($suffixText), '').$suffixText;
        }

        return $candidate;
    }

    private function isCustomerRole(string $role): bool
    {
        return in_array($role, ['cliente', 'client'], true);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function generateCustomerDisplayName(array $validated): string
    {
        $name = (string) (
            $validated['supermarket_name']
            ?? $validated['business_name']
            ?? 'Cliente informativo'
        );

        return Str::limit(trim($name), 255, '');
    }
}
