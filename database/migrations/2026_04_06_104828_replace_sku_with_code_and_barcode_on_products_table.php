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
        Schema::table('products', function (Blueprint $table) {
            $table->string('code')->nullable()->after('category_id');
            $table->string('barcode')->nullable()->after('code');
        });

        DB::table('products')
            ->select(['id', 'sku'])
            ->orderBy('id')
            ->chunkById(100, function ($products): void {
                foreach ($products as $product) {
                    DB::table('products')
                        ->where('id', $product->id)
                        ->update([
                            'code' => $product->sku,
                            'barcode' => $product->sku,
                        ]);
                }
            });

        Schema::table('products', function (Blueprint $table) {
            $table->unique('code');
            $table->unique('barcode');
            $table->dropUnique('products_sku_unique');
            $table->dropColumn('sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('sku')->nullable()->after('category_id');
        });

        DB::table('products')
            ->select(['id', 'code'])
            ->orderBy('id')
            ->chunkById(100, function ($products): void {
                foreach ($products as $product) {
                    DB::table('products')
                        ->where('id', $product->id)
                        ->update([
                            'sku' => $product->code,
                        ]);
                }
            });

        Schema::table('products', function (Blueprint $table) {
            $table->unique('sku');
            $table->dropUnique('products_code_unique');
            $table->dropUnique('products_barcode_unique');
            $table->dropColumn(['code', 'barcode']);
        });
    }
};
