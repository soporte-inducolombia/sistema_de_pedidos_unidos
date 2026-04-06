<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Codigo OTP de la Orden Nro {{ $orderNumber }}</title>
</head>
<body>
<p>Hola,</p>
<p>Se genero una solicitud de confirmacion para la <strong>Orden Nro {{ $orderNumber }}</strong>.</p>
<p>Tu codigo de verificacion es:</p>
<p style="font-size: 24px; letter-spacing: 4px;"><strong>{{ $code }}</strong></p>
<p>Este codigo expira en {{ config('orders.otp.ttl_minutes') }} minutos.</p>
<p>Ingresa este codigo en el modulo de Pedidos para confirmar la orden.</p>
<p>Si no reconoces esta solicitud, ignora este mensaje.</p>
</body>
</html>
