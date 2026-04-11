<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status');
            $table->index('deleted_at');
        });

        Schema::table('providers', function (Blueprint $table) {
            $table->index('deleted_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('deleted_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('deleted_at');
        });

        Schema::table('provider_products', function (Blueprint $table) {
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('providers', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('provider_products', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });
    }
};
