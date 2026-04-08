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
            'Cantidad',
            'Cliente',
            'Precio base',
            'Precio rueda',
            'Descuento',
            'Total',
        ];
    }

    public function array(): array
    {
        $rows = [];
        $orderNumber = $this->order->order_number ?? $this->order->id;

        foreach ($this->order->items as $item) {
            $unitOriginalPrice = (float) $item->unit_original_price;
            $unitSpecialPrice = (float) $item->unit_special_price;
            $discountPercent = 0.0;

            if ($unitOriginalPrice > 0) {
                $discountPercent = (($unitOriginalPrice - $unitSpecialPrice) / $unitOriginalPrice) * 100;
            }

            $rows[] = [
                $orderNumber,
                $this->order->provider?->company_name,
                $item->snapshot_product_name,
                $item->product?->barcode,
                $item->snapshot_sku,
                $item->quantity,
                $this->order->customer_email,
                number_format($unitOriginalPrice, 2, '.', ''),
                number_format($unitSpecialPrice, 2, '.', ''),
                number_format(max(0, min(100, $discountPercent)), 2, '.', ''),
                number_format((float) $item->line_special_total, 2, '.', ''),
            ];
        }

        return $rows;
    }
}
