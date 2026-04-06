<?php

namespace App\Exports;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class OrderConfirmedExport implements FromArray, ShouldAutoSize, WithHeadings
{
    public function __construct(private readonly Order $order) {}

    public function headings(): array
    {
        return [
            'Pedido',
            'Proveedor',
            'Producto',
            'Codigo de barras',
            'Codigo',
            'Descripcion',
            'Cantidad',
            'Cliente',
            'Total',
        ];
    }

    public function array(): array
    {
        $rows = [];
        $orderNumber = $this->order->order_number ?? $this->order->id;
        $orderTotal = (string) $this->order->subtotal_special;

        foreach ($this->order->items as $item) {
            $rows[] = [
                $orderNumber,
                $this->order->provider?->company_name,
                $item->snapshot_product_name,
                $item->product?->barcode,
                $item->snapshot_sku,
                $item->product?->description,
                $item->quantity,
                $this->order->customer_email,
                $orderTotal,
            ];
        }

        return $rows;
    }
}
