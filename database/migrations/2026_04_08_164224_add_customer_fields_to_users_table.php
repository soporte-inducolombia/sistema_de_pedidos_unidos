<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nit', 30)->nullable()->after('role');
            $table->string('business_name', 255)->nullable()->after('nit');
            $table->string('supermarket_name', 255)->nullable()->after('business_name');
            $table->string('address', 255)->nullable()->after('supermarket_name');
            $table->string('city', 120)->nullable()->after('address');
            $table->string('department', 120)->nullable()->after('city');

            $table->index('nit');
            $table->index('supermarket_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['nit']);
            $table->dropIndex(['supermarket_name']);
            $table->dropColumn([
                'nit',
                'business_name',
                'supermarket_name',
                'address',
                'city',
                'department',
            ]);
        });
    }
};
