<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('provider_products') || ! Schema::hasTable('products')) {
            return;
        }

        $assignments = DB::table('provider_products')
            ->join('products', 'products.id', '=', 'provider_products.product_id')
            ->where('provider_products.discount_type', 'fixed')
            ->select([
                'provider_products.id',
                'provider_products.discount_value',
                'products.original_price',
            ])
            ->get();

        foreach ($assignments as $assignment) {
            $originalPrice = (float) $assignment->original_price;
            $fixedDiscount = (float) $assignment->discount_value;

            $discountPercent = $originalPrice <= 0
                ? 0
                : min(100, round(($fixedDiscount / $originalPrice) * 100, 2));

            $specialPrice = round($originalPrice * ((100 - $discountPercent) / 100), 2);

            DB::table('provider_products')
                ->where('id', $assignment->id)
                ->update([
                    'discount_type' => 'percent',
                    'discount_value' => $discountPercent,
                    'special_price' => $specialPrice,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-reversible migration: fixed discounts are normalized to percent.
    }
};
