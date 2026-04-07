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
            ->select(['id', 'name', 'username', 'role', 'created_at'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
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
        $user = User::query()->create($request->validated());

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
        if ($user->role === 'provider') {
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

        if ($previousRole === 'provider' && $user->provider !== null && $user->provider->is_active) {
            $user->provider->update([
                'is_active' => false,
            ]);
        }
    }
}
