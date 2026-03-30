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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('snapshot_product_name');
            $table->string('snapshot_sku')->nullable();
            $table->string('snapshot_category_name')->nullable();
            $table->decimal('unit_original_price', 12, 2);
            $table->decimal('unit_special_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('line_original_total', 12, 2);
            $table->decimal('line_special_total', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
