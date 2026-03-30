<?php

use App\Enums\OrderStatus;
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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('provider_id')->constrained()->restrictOnDelete();
            $table->string('customer_email');
            $table->string('status', 20)->default(OrderStatus::PENDING->value);
            $table->decimal('subtotal_original', 12, 2)->default(0);
            $table->decimal('subtotal_special', 12, 2)->default(0);
            $table->decimal('total_discount', 12, 2)->default(0);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['provider_id', 'status']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
