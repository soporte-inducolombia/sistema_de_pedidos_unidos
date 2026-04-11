<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Role::query()->firstOrCreate(
            ['slug' => UserRole::ADMIN->value],
            ['name' => 'Administrador'],
        );

        Role::query()->firstOrCreate(
            ['slug' => UserRole::PROVIDER->value],
            ['name' => 'Proveedor'],
        );

        Role::query()->firstOrCreate(
            ['slug' => UserRole::CUSTOMER->value],
            ['name' => 'Cliente'],
        );

        User::factory()->create([
            'name' => 'Soporte Unidos',
            'username' => 'soporte_inducolombia',
            'role' => UserRole::ADMIN->value,
        ]);
    }
}
