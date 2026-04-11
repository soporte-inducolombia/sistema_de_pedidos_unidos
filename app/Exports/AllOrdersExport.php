<?php

namespace App\Exports;

use App\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class AllOrdersExport implements FromCollection, ShouldAutoSize, WithColumnFormatting, WithHeadings
{
    public function headings(): array
    {
        return [
            'Pedido',
            'Proveedor',
            'Producto',
            'Codigo de barras',
            'Codigo',
            'Cantidad',
            'Embalaje',
            'Razon social del cliente',
            'Nombre del supermercado',
            'Precio base',
            'Precio rueda',
            'Descuento (%)',
            'Total',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'D' => NumberFormat::FORMAT_TEXT, // Codigo de barras
        ];
    }

    public function collection(): Collection
    {
        $orders = Order::query()
            ->with(['provider', 'customerUser', 'items.product'])
            ->orderBy('order_number')
            ->get();

        $rows = collect();

        foreach ($orders as $order) {
            $orderNumber = $order->order_number ?? $order->id;

            foreach ($order->items as $item) {
                $unitOriginalPrice = (float) $item->unit_original_price;
                $unitSpecialPrice = (float) $item->unit_special_price;

                $discountPercent = 0.0;
                if ($unitOriginalPrice > 0) {
                    $discountPercent = (($unitOriginalPrice - $unitSpecialPrice) / $unitOriginalPrice) * 100;
                }

                $rows->push([
                    $orderNumber,
                    $order->provider?->company_name,
                    $item->snapshot_product_name,
                    $item->product?->barcode,
                    $item->snapshot_sku,
                    $item->quantity,
                    $item->product?->packaging_multiple,
                    $order->customerUser?->business_name,
                    $order->customerUser?->supermarket_name,
                    number_format($unitOriginalPrice, 2, '.', ''),
                    number_format($unitSpecialPrice, 2, '.', ''),
                    number_format(max(0.0, min(100.0, $discountPercent)), 2, '.', ''),
                    number_format((float) $item->line_special_total, 2, '.', ''),
                ]);
            }
        }

        return $rows;
    }
}
