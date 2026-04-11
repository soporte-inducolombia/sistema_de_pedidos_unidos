<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden Nro {{ $orderNumber }} confirmada</title>
</head>
<body>
<p>Hola {{ $recipientType }},</p>
<p>La <strong>Orden Nro {{ $orderNumber }}</strong> fue confirmada exitosamente en el sistema.</p>
<p>Proveedor: <strong>{{ $order->provider?->company_name }}</strong></p>
<p>Cliente: <strong>{{ $order->customer_email }}</strong></p>
<p>Fecha de confirmacion: <strong>{{ $order->confirmed_at?->format('Y-m-d H:i') ?? 'Sin fecha registrada' }}</strong></p>
<table border="1" cellpadding="6" cellspacing="0" width="100%">
    <thead>
    <tr>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Embalaje</th>
        <th>Precio base</th>
        <th>Precio rueda</th>
        <th>Descuento</th>
        <th>Total</th>
    </tr>
    </thead>
    <tbody>
    @foreach($order->items as $item)
        @php
            $unitOriginal = (float) $item->unit_original_price;
            $unitSpecial  = (float) $item->unit_special_price;
            $discountPct  = $unitOriginal > 0
                ? round((1 - $unitSpecial / $unitOriginal) * 100, 2)
                : 0;
            $packaging    = $item->product?->packaging_multiple ?? 1;
        @endphp
        <tr>
            <td>{{ $item->snapshot_product_name }}</td>
            <td>{{ $item->quantity }}</td>
            <td>x{{ $packaging }}</td>
            <td>${{ number_format($unitOriginal, 2) }}</td>
            <td>${{ number_format($unitSpecial, 2) }}</td>
            <td>{{ $discountPct }}%</td>
            <td>${{ number_format((float) $item->line_special_total, 2) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
<p>Total de la orden: <strong>{{ number_format((float) $order->subtotal_special, 2) }}</strong></p>
<p>Descuento total aplicado: <strong>{{ number_format((float) $order->total_discount, 2) }}</strong></p>
<p>Gracias por usar UNIDOS.</p>
</body>
</html>
