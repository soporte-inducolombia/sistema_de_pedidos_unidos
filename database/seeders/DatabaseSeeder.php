<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        Role::query()->firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrador'],
        );

        Role::query()->firstOrCreate(
            ['slug' => 'provider'],
            ['name' => 'Proveedor'],
        );

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'soporte.inducolombia@gmail.com',
            'role' => 'admin',
        ]);
    }
}
