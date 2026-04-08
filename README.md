# Sistema de Pedidos Unidos

Aplicacion web para administrar productos, asignaciones por proveedor y flujo de pedidos con confirmacion por OTP.

## Stack Tecnico

- PHP 8.3
- Laravel 13
- Inertia.js + React 19 + TypeScript
- Tailwind CSS 4
- MySQL o SQLite
- Laravel Queue (colas para correo y exportes)

## Modulos Principales

- Administracion de productos
- Asignacion de productos a proveedores
- Gestion de usuarios y roles (`admin`, `provider`, `cliente`)
- Flujo de pedidos para proveedor
- Confirmacion por OTP
- Exportacion de pedidos confirmados
- Papelera de reciclaje para entidades eliminadas logicamente

## Requisitos Previos

- PHP 8.3+
- Composer 2+
- Node.js 20+ y npm
- Base de datos (MySQL recomendado en produccion)

## Instalacion Rapida

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
npm install
npm run build
```

Tambien puedes usar el script de bootstrap:

```bash
composer run setup
```

## Variables de Entorno Clave

Configura al menos:

- `APP_URL`
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `QUEUE_CONNECTION`
- `MAIL_MAILER`, `MAIL_SCHEME`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`

Notas:

- Este proyecto usa `MAIL_SCHEME` en la configuracion SMTP.
- Las colas de ordenes usan por defecto `mails` y `exports`.

## Ejecucion en Desarrollo

### Opcion 1: Todo junto con Composer

```bash
composer run dev
```

Esto inicia servidor Laravel, worker de cola y Vite dev server de forma concurrente.

### Opcion 2: Procesos separados

```bash
php artisan serve
npm run dev
php artisan queue:work --queue=mails,exports
```

Si usas Laragon/Apache con dominio local, no necesitas `php artisan serve`.

## Flujo Operativo de Pedidos

1. Admin crea productos.
2. Admin asigna productos a proveedores con descuento.
3. Proveedor crea pedido, selecciona cliente y firma.
4. Sistema envia OTP al correo del cliente.
5. Proveedor confirma OTP para cerrar el pedido.
6. Se disparan notificaciones y exportes asociados.

## Usuario Inicial

El seeder crea un usuario admin base:

- Username: `soporte_inducolombia`
- Password: `password`

Se recomienda cambiar la clave inmediatamente en ambientes reales.

## Comandos Utiles

### Pruebas

```bash
php artisan test --compact
```

Ejemplo de prueba focalizada:

```bash
php artisan test --compact tests/Feature/Admin/UserManagementTest.php
```

### Formato PHP

```bash
vendor/bin/pint --dirty --format agent
```

### Build Frontend

```bash
npm run build
```

## Troubleshooting

### Error SQL por columna faltante (ejemplo: `Unknown column 'nit'`)

Faltan migraciones por aplicar:

```bash
php artisan migrate
```

### Error Inertia/Vite: `Unable to locate file in Vite manifest`

Genera assets o ejecuta modo dev:

```bash
npm run build
# o
npm run dev
```

### OTP no llega por correo

Verifica 3 puntos:

1. SMTP correcto en `.env` (incluyendo `MAIL_SCHEME`).
2. Worker de cola activo.
3. Worker consumiendo las colas correctas:

```bash
php artisan queue:work --queue=mails,exports
```

## Seguridad y Buenas Practicas

- No subir `.env` ni secretos al repositorio.
- Usar colas y cache en entorno productivo.
- Mantener dependencias y migraciones al dia.
- Ejecutar pruebas antes de desplegar.
