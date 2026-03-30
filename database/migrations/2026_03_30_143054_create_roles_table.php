<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 50)->unique();
            $table->timestamps();
        });

        $now = now();

        DB::table('roles')->insert([
            [
                'name' => 'Administrador',
                'slug' => 'admin',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Proveedor',
                'slug' => 'provider',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $existingRoles = DB::table('users')
            ->select('role')
            ->distinct()
            ->pluck('role')
            ->filter(fn ($role): bool => is_string($role) && $role !== '');

        foreach ($existingRoles as $role) {
            DB::table('roles')->updateOrInsert(
                ['slug' => $role],
                [
                    'name' => Str::headline($role),
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
