<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure admins can access users administration.
     */
    public function test_admin_can_view_users_management_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $managedUser = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.users.index'));

        $response->assertOk();
        $response->assertSee($managedUser->username);
    }

    public function test_non_admin_users_cannot_access_users_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.users.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_update_user_name_username_and_role(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($admin)->patch(route('admin.users.update', $targetUser), [
            'name' => 'Usuario Editado',
            'username' => 'usuario_editado',
            'role' => 'admin',
        ]);

        $response->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'name' => 'Usuario Editado',
            'username' => 'usuario_editado',
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_create_user_from_users_module(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'Nuevo Usuario',
            'username' => 'nuevo_usuario',
            'role' => 'provider',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'name' => 'Nuevo Usuario',
            'username' => 'nuevo_usuario',
            'role' => 'provider',
        ]);

        $createdUser = User::query()->where('username', 'nuevo_usuario')->first();

        $this->assertNotNull($createdUser);

        $this->assertDatabaseHas('providers', [
            'user_id' => $createdUser?->id,
            'is_active' => true,
        ]);
    }

    public function test_non_admin_cannot_create_user_from_users_module(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->post(route('admin.users.store'), [
            'name' => 'No Permitido',
            'username' => 'no_permitido',
            'role' => 'provider',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseMissing('users', [
            'username' => 'no_permitido',
        ]);
    }

    public function test_admin_can_create_customer_user_without_manual_credentials(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.users.store'), [
            'role' => 'cliente',
            'nit' => '900123456-7',
            'business_name' => 'Comercial Uno SAS',
            'supermarket_name' => 'Supermercado Uno',
            'address' => 'Calle 10 # 20-30',
            'city' => 'Medellin',
            'department' => 'Antioquia',
            'email' => 'cliente.uno@example.com',
        ]);

        $response->assertRedirect(route('admin.users.index'));

        $createdUser = User::query()
            ->where('nit', '900123456-7')
            ->first();

        $this->assertNotNull($createdUser);
        $this->assertSame('cliente', $createdUser->role);
        $this->assertSame('Supermercado Uno', $createdUser->name);
        $this->assertSame('Comercial Uno SAS', $createdUser->business_name);
        $this->assertSame('Supermercado Uno', $createdUser->supermarket_name);
        $this->assertNotNull($createdUser->username);
        $this->assertNotNull($createdUser->password);
    }

    public function test_admin_can_update_user_password(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'provider',
            'username' => 'proveedor_password',
        ]);

        $originalPasswordHash = $targetUser->password;

        $response = $this->actingAs($admin)->patch(route('admin.users.update', $targetUser), [
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'role' => $targetUser->role,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertRedirect(route('admin.users.index'));

        $targetUser->refresh();

        $this->assertNotSame($originalPasswordHash, $targetUser->password);
        $this->assertTrue(Hash::check('SecurePass123!', (string) $targetUser->password));
    }

    public function test_admin_can_delete_another_user_but_not_self(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.users.destroy', $targetUser));

        $response->assertRedirect(route('admin.users.index'));
        $this->assertSoftDeleted('users', [
            'id' => $targetUser->id,
        ]);

        $selfDeleteResponse = $this->actingAs($admin)->delete(route('admin.users.destroy', $admin));

        $selfDeleteResponse->assertSessionHasErrors('delete');
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    }

    public function test_admin_cannot_delete_user_when_provider_has_orders(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'provider',
        ]);

        $provider = Provider::factory()->create([
            'user_id' => $targetUser->id,
        ]);

        Order::factory()->create([
            'provider_id' => $provider->id,
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.users.destroy', $targetUser));

        $response->assertSessionHasErrors('delete');

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
        ]);
    }

    public function test_assigning_provider_role_creates_and_toggles_provider_profile(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $targetUser = User::factory()->create([
            'role' => 'admin',
            'name' => 'Proveedor Demo',
            'username' => 'proveedor_demo',
        ]);

        $promoteResponse = $this->actingAs($admin)->patch(route('admin.users.update', $targetUser), [
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'role' => 'provider',
        ]);

        $promoteResponse->assertRedirect(route('admin.users.index'));

        $providerProfile = Provider::query()->where('user_id', $targetUser->id)->first();

        $this->assertNotNull($providerProfile);

        $this->assertDatabaseHas('providers', [
            'user_id' => $targetUser->id,
            'is_active' => true,
        ]);

        $demoteResponse = $this->actingAs($admin)->patch(route('admin.users.update', $targetUser), [
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'role' => 'admin',
        ]);

        $demoteResponse->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('providers', [
            'user_id' => $targetUser->id,
            'is_active' => false,
        ]);

        $reactivateResponse = $this->actingAs($admin)->patch(route('admin.users.update', $targetUser), [
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'role' => 'provider',
        ]);

        $reactivateResponse->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('providers', [
            'user_id' => $targetUser->id,
            'is_active' => true,
        ]);
    }
}
