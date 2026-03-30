<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Resumen del pedido</title>
</head>
<body>
<p>Hola {{ $recipientType }},</p>
<p>El pedido <strong>{{ $order->public_id }}</strong> fue confirmado exitosamente.</p>
<p>Proveedor: <strong>{{ $order->provider?->company_name }}</strong></p>
<p>Cliente: <strong>{{ $order->customer_email }}</strong></p>
<table border="1" cellpadding="6" cellspacing="0" width="100%">
    <thead>
    <tr>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Precio Original</th>
        <th>Precio Especial</th>
        <th>Subtotal Especial</th>
    </tr>
    </thead>
    <tbody>
    @foreach($order->items as $item)
        <tr>
            <td>{{ $item->snapshot_product_name }}</td>
            <td>{{ $item->quantity }}</td>
            <td>{{ number_format((float) $item->unit_original_price, 2) }}</td>
            <td>{{ number_format((float) $item->unit_special_price, 2) }}</td>
            <td>{{ number_format((float) $item->line_special_total, 2) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
<p>Total pedido: <strong>{{ number_format((float) $order->subtotal_special, 2) }}</strong></p>
<p>Descuento total aplicado: <strong>{{ number_format((float) $order->total_discount, 2) }}</strong></p>
</body>
</html>
