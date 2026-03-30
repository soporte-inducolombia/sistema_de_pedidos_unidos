<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Codigo OTP del pedido</title>
</head>
<body>
<p>Hola,</p>
<p>Se genero una solicitud de confirmacion para el pedido <strong>{{ $order->public_id }}</strong>.</p>
<p>Tu codigo de verificacion es:</p>
<p style="font-size: 24px; letter-spacing: 4px;"><strong>{{ $code }}</strong></p>
<p>Este codigo expira en {{ config('orders.otp.ttl_minutes') }} minutos.</p>
<p>Si no reconoces esta solicitud, ignora este mensaje.</p>
</body>
</html>
