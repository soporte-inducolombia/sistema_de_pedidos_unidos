<?php

namespace App\Exports;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class OrderConfirmedExport implements FromArray, ShouldAutoSize, WithHeadings
{
    public function __construct(private readonly Order $order)
    {
    }

    public function headings(): array
    {
        return [
            'Pedido',
            'Proveedor',
            'Cliente',
            'SKU',
            'Producto',
            'Categoria',
            'Cantidad',
            'Precio Original Unitario',
            'Precio Especial Unitario',
            'Subtotal Original',
            'Subtotal Especial',
            'Descuento',
        ];
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->order->items as $item) {
            $rows[] = [
                $this->order->public_id,
                $this->order->provider?->company_name,
                $this->order->customer_email,
                $item->snapshot_sku,
                $item->snapshot_product_name,
                $item->snapshot_category_name,
                $item->quantity,
                $item->unit_original_price,
                $item->unit_special_price,
                $item->line_original_total,
                $item->line_special_total,
                bcsub((string) $item->line_original_total, (string) $item->line_special_total, 2),
            ];
        }

        return $rows;
    }
}
