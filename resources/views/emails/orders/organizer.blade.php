<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Pedido confirmado para control</title>
</head>
<body>
<p>Equipo UNIDOS,</p>
<p>Se confirma el pedido <strong>{{ $order->public_id }}</strong>.</p>
<p>Proveedor: <strong>{{ $order->provider?->company_name }}</strong></p>
<p>Correo cliente: <strong>{{ $order->customer_email }}</strong></p>
<p>En este correo se adjunta el archivo .xlsx con el detalle del pedido.</p>
</body>
</html>
