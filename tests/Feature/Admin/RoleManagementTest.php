<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure admins can access roles administration.
     */
    public function test_admin_can_view_roles_management_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.roles.index'));

        $response->assertOk();
        $response->assertSee('admin');
    }

    public function test_non_admin_users_cannot_access_roles_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.roles.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_create_a_role(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.roles.store'), [
            'name' => 'Supervisor Comercial',
            'slug' => 'supervisor-comercial',
        ]);

        $response->assertRedirect(route('admin.roles.index'));

        $this->assertDatabaseHas('roles', [
            'name' => 'Supervisor Comercial',
            'slug' => 'supervisor-comercial',
        ]);
    }

    public function test_admin_can_update_role_and_sync_assigned_users_slug(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $role = Role::factory()->create([
            'name' => 'Supervisor',
            'slug' => 'supervisor',
        ]);

        $assignedUser = User::factory()->create([
            'role' => 'supervisor',
        ]);

        $response = $this->actingAs($admin)->patch(route('admin.roles.update', $role), [
            'name' => 'Jefe de Zona',
            'slug' => 'jefe-zona',
        ]);

        $response->assertRedirect(route('admin.roles.index'));

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'Jefe de Zona',
            'slug' => 'jefe-zona',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $assignedUser->id,
            'role' => 'jefe-zona',
        ]);
    }

    public function test_admin_can_delete_unassigned_role_but_cannot_delete_admin_or_assigned_roles(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $freeRole = Role::factory()->create([
            'name' => 'Temporal',
            'slug' => 'temporal',
        ]);

        $assignedRole = Role::factory()->create([
            'name' => 'Operador',
            'slug' => 'operador',
        ]);

        User::factory()->create([
            'role' => 'operador',
        ]);

        $deleteFreeRoleResponse = $this->actingAs($admin)->delete(route('admin.roles.destroy', $freeRole));
        $deleteFreeRoleResponse->assertRedirect(route('admin.roles.index'));
        $this->assertSoftDeleted('roles', [
            'id' => $freeRole->id,
        ]);

        $deleteAssignedRoleResponse = $this->actingAs($admin)->delete(route('admin.roles.destroy', $assignedRole));
        $deleteAssignedRoleResponse->assertSessionHasErrors('deleteRole');
        $this->assertDatabaseHas('roles', [
            'id' => $assignedRole->id,
        ]);

        $adminRole = Role::query()->where('slug', 'admin')->firstOrFail();
        $deleteAdminRoleResponse = $this->actingAs($admin)->delete(route('admin.roles.destroy', $adminRole));
        $deleteAdminRoleResponse->assertSessionHasErrors('deleteRole');
        $this->assertDatabaseHas('roles', [
            'id' => $adminRole->id,
        ]);
    }
}
