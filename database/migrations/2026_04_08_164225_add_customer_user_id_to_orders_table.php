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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('customer_user_id')
                ->nullable()
                ->after('provider_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->index(['provider_id', 'customer_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['provider_id', 'customer_user_id']);
            $table->dropConstrainedForeignId('customer_user_id');
        });
    }
};
