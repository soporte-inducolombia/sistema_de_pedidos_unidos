<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('order_number')->nullable()->after('public_id');
        });

        $providerIds = DB::table('orders')
            ->select('provider_id')
            ->distinct()
            ->pluck('provider_id');

        foreach ($providerIds as $providerId) {
            $orderIds = DB::table('orders')
                ->where('provider_id', $providerId)
                ->orderBy('created_at')
                ->orderBy('id')
                ->pluck('id');

            $nextOrderNumber = 1;

            foreach ($orderIds as $orderId) {
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update(['order_number' => $nextOrderNumber]);

                $nextOrderNumber++;
            }
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->unique(['provider_id', 'order_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_provider_id_order_number_unique');
            $table->dropColumn('order_number');
        });
    }
};
