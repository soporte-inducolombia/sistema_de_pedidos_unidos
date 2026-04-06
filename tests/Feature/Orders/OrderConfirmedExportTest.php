<?php

namespace Tests\Feature\Orders;

use App\Exports\OrderConfirmedExport;
use App\Models\Order;
use App\Models\Product;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderConfirmedExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_contains_only_requested_columns_with_system_order_number(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
            'company_name' => 'Proveedor Demo',
        ]);

        $product = Product::factory()->create([
            'name' => 'Producto Demo',
            'barcode' => '7701234567890',
            'description' => 'Descripcion del producto demo',
            'code' => 'COD-DEMO-01',
        ]);

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => 88,
            'customer_email' => 'cliente@example.com',
            'subtotal_special' => '135.50',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'snapshot_product_name' => 'Producto Demo',
            'snapshot_sku' => 'COD-DEMO-01',
            'snapshot_category_name' => null,
            'unit_original_price' => 80,
            'unit_special_price' => 67.75,
            'quantity' => 2,
            'line_original_total' => 160,
            'line_special_total' => 135.50,
        ]);

        $order->load('items.product', 'provider');

        $export = new OrderConfirmedExport($order);

        $this->assertSame([
            'Pedido',
            'Proveedor',
            'Producto',
            'Codigo de barras',
            'Codigo',
            'Descripcion',
            'Cantidad',
            'Cliente',
            'Total',
        ], $export->headings());

        $rows = $export->array();

        $this->assertCount(1, $rows);
        $this->assertSame([
            88,
            'Proveedor Demo',
            'Producto Demo',
            '7701234567890',
            'COD-DEMO-01',
            'Descripcion del producto demo',
            2,
            'cliente@example.com',
            '135.50',
        ], $rows[0]);
    }

    public function test_export_falls_back_to_internal_id_when_order_number_is_missing(): void
    {
        $provider = Provider::factory()->create([
            'user_id' => User::factory()->create([
                'role' => 'provider',
            ])->id,
        ]);

        $product = Product::factory()->create();

        $order = Order::factory()->create([
            'provider_id' => $provider->id,
            'order_number' => null,
            'subtotal_special' => '10.00',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'snapshot_product_name' => $product->name,
            'snapshot_sku' => $product->code,
            'snapshot_category_name' => null,
            'unit_original_price' => 10,
            'unit_special_price' => 10,
            'quantity' => 1,
            'line_original_total' => 10,
            'line_special_total' => 10,
        ]);

        $order->load('items.product', 'provider');

        $rows = (new OrderConfirmedExport($order))->array();

        $this->assertSame($order->id, $rows[0][0]);
    }
}
