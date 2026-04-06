<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden Nro {{ $orderNumber }} confirmada para control</title>
</head>
<body>
<p>Equipo UNIDOS,</p>
<p>Se confirma la <strong>Orden Nro {{ $orderNumber }}</strong>.</p>
<p>Proveedor: <strong>{{ $order->provider?->company_name }}</strong></p>
<p>Correo cliente: <strong>{{ $order->customer_email }}</strong></p>
<p>Fecha de confirmacion: <strong>{{ $order->confirmed_at?->format('Y-m-d H:i') ?? 'Sin fecha registrada' }}</strong></p>
<p>En este correo se adjunta el archivo .xlsx con el detalle completo de la orden.</p>
</body>
</html>
