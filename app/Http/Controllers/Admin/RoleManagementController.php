<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RoleUpsertRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleManagementController extends Controller
{
    /**
     * Show roles administration page.
     */
    public function index(Request $request): Response
    {
        $roles = Role::query()
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'users_count' => $role->users_count,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Store a new role.
     */
    public function store(RoleUpsertRequest $request): RedirectResponse
    {
        Role::query()->create($request->validated());

        return to_route('admin.roles.index')->with('status', 'Rol creado correctamente.');
    }

    /**
     * Update role data.
     */
    public function update(RoleUpsertRequest $request, Role $role): RedirectResponse
    {
        $validated = $request->validated();

        if ($role->slug === 'admin' && $validated['slug'] !== 'admin') {
            return to_route('admin.roles.index')->withErrors([
                'updateRole' => 'El rol admin no puede cambiar su slug.',
            ]);
        }

        $oldSlug = $role->slug;
        $role->update($validated);

        if ($oldSlug !== $role->slug) {
            User::query()->where('role', $oldSlug)->update([
                'role' => $role->slug,
            ]);
        }

        return to_route('admin.roles.index')->with('status', 'Rol actualizado correctamente.');
    }

    /**
     * Delete a role.
     */
    public function destroy(Role $role): RedirectResponse
    {
        if ($role->slug === 'admin') {
            return to_route('admin.roles.index')->withErrors([
                'deleteRole' => 'El rol admin no se puede eliminar.',
            ]);
        }

        $assignedUsers = User::query()->where('role', $role->slug)->count();

        if ($assignedUsers > 0) {
            return to_route('admin.roles.index')->withErrors([
                'deleteRole' => 'No puedes eliminar un rol asignado a usuarios.',
            ]);
        }

        $role->delete();

        return to_route('admin.roles.index')->with('status', 'Rol eliminado correctamente.');
    }
}
