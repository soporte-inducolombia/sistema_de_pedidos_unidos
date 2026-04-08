<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        DB::table('roles')->updateOrInsert(
            ['slug' => 'cliente'],
            [
                'name' => 'Cliente',
                'updated_at' => $now,
                'created_at' => $now,
            ],
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->where('slug', 'cliente')->delete();
    }
};
