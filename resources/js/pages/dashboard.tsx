import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    ClipboardList,
    PackageSearch,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatCopCurrency } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminProviderProductsIndex } from '@/routes/admin/provider-products';
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as providerOrdersIndex } from '@/routes/provider/orders';

type AdminSummary = {
    products_count: number;
    providers_count: number;
    pending_orders_count: number;
    confirmed_orders_count: number;
    recent_orders: {
        public_id: string;
        order_number: number | null;
        status: string;
        customer_email: string;
        provider_name: string | null;
        provider_username: string | null;
        subtotal_special: string;
        total_discount: string;
        created_at: string | null;
    }[];
};

type ProviderWorkspace = {
    provider: {
        company_name: string;
        stand_label: string;
    };
    metrics: {
        products_count: number;
        pending_orders_count: number;
        confirmed_orders_count: number;
        total_sales: number;
    };
    recent_orders: {
        public_id: string;
        order_number: number;
        status: string;
        customer_email: string | null;
        subtotal_special: string;
        total_discount: string;
        created_at: string | null;
        confirmed_at: string | null;
    }[];
};

type Props = {
    status?: string;
    adminSummary: AdminSummary | null;
    providerWorkspace: ProviderWorkspace | null;
};

const formatDateTime = (value: string | null): string => {
    if (value === null) {
        return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
};

const getStatusLabel = (status: string): string => {
    if (status === 'confirmed') {
        return 'Confirmado';
    }

    if (status === 'pending') {
        return 'Pendiente';
    }

    return status;
};

function PendingOrderCard({ order }: { order: ProviderWorkspace['recent_orders'][number] }) {
    const isConfirmed = order.status === 'confirmed';

    return (
        <Card className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800">
            <CardHeader
                className={
                    isConfirmed
                        ? 'bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10'
                        : 'bg-linear-to-r from-amber-500/10 via-orange-500/10 to-cyan-500/10'
                }
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle>Orden Nro {order.order_number}</CardTitle>
                        <CardDescription>
                            {order.customer_email ? `Cliente: ${order.customer_email}` : 'Sin correo registrado'}
                        </CardDescription>
                    </div>
                    <Badge variant={isConfirmed ? 'default' : 'outline'}>
                        {getStatusLabel(order.status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium">{formatCopCurrency(order.subtotal_special)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs text-muted-foreground">Ahorro</p>
                        <p className="font-medium">{formatCopCurrency(order.total_discount)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50 md:col-span-2">
                        <p className="text-xs text-muted-foreground">Creado</p>
                        <p className="font-medium">{formatDateTime(order.created_at)}</p>
                    </div>
                </div>

                {order.status === 'pending' && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        Pendiente de confirmacion
                    </div>
                )}

                {isConfirmed && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                        Confirmado: {formatDateTime(order.confirmed_at)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ status, adminSummary, providerWorkspace }: Props) {
    const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

    const filteredRecentOrders = useMemo(() => {
        if (providerWorkspace === null) {
            return [];
        }

        if (orderFilter === 'all') {
            return providerWorkspace.recent_orders;
        }

        return providerWorkspace.recent_orders.filter((order) => {
            return order.status === orderFilter;
        });
    }, [orderFilter, providerWorkspace]);


    const providerStats = providerWorkspace?.metrics ?? {
        products_count: 0,
        pending_orders_count: 0,
        confirmed_orders_count: 0,
        total_sales: 0,
    };

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Dashboard operativo"
                    description="Gestiona catalogo, asignaciones y pedidos desde un solo lugar"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {adminSummary !== null && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader>
                                    <CardDescription>Productos</CardDescription>
                                    <CardTitle>{adminSummary.products_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardDescription>Proveedores</CardDescription>
                                    <CardTitle>{adminSummary.providers_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardDescription>Pedidos pendientes</CardDescription>
                                    <CardTitle>{adminSummary.pending_orders_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardDescription>Pedidos confirmados</CardDescription>
                                    <CardTitle>{adminSummary.confirmed_orders_count}</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Acciones rapidas de administracion</CardTitle>
                                <CardDescription>
                                    Accede a los modulos centrales del sistema.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link href={adminOrdersIndex()}>Pedidos</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={adminProductsIndex()}>Productos</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={adminProviderProductsIndex()}>
                                        Asignaciones
                                    </Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={adminUsersIndex()}>Usuarios</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={adminRolesIndex()}>Roles</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/admin/recycle-bin">Papelera</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Ultimos pedidos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {adminSummary.recent_orders.map((order) => (
                                        <div
                                            key={order.public_id}
                                            className="rounded-md border p-3 text-sm"
                                        >
                                            <div className="font-medium">
                                                Orden Nro {order.order_number ?? '-'} • {order.status}
                                            </div>
                                            <div className="text-muted-foreground">
                                                {order.customer_email} - {order.provider_name}{order.provider_username ? ` (${order.provider_username})` : ''}
                                            </div>
                                            <div className="text-muted-foreground">
                                                Total facturado: {formatCopCurrency(order.subtotal_special)}
                                            </div>
                                        </div>
                                    ))}

                                    {adminSummary.recent_orders.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            Aun no hay pedidos registrados.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {providerWorkspace !== null && (
                    <div className="space-y-4">
                        <Card className="border-cyan-500/25 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="size-5 text-cyan-600" />
                                    {providerWorkspace.provider.company_name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <PackageSearch className="size-4" />
                                    {providerWorkspace.provider.stand_label}
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-cyan-500/20">
                                <CardHeader>
                                    <CardDescription>Productos asignados</CardDescription>
                                    <CardTitle>{providerStats.products_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-amber-500/20">
                                <CardHeader>
                                    <CardDescription>Pedidos pendientes</CardDescription>
                                    <CardTitle>{providerStats.pending_orders_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-emerald-500/20">
                                <CardHeader>
                                    <CardDescription>Pedidos confirmados</CardDescription>
                                    <CardTitle>{providerStats.confirmed_orders_count}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-sky-500/20">
                                <CardHeader>
                                    <CardDescription>Total facturado</CardDescription>
                                    <CardTitle>{formatCopCurrency(providerStats.total_sales)}</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardList className="size-5 text-cyan-600" />
                                    Gestion de pedidos
                                </CardTitle>
                                <CardDescription>
                                    La creacion, edicion y eliminacion de pedidos ahora se gestiona en el modulo Pedidos.
                                </CardDescription>
                                <div>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={providerOrdersIndex()}>
                                            Ir al modulo Pedidos
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Desde el dashboard solo se muestra informacion operativa de pedidos confirmados y pendientes por confirmar.
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarClock className="size-5 text-cyan-600" />
                                    Historial reciente
                                </CardTitle>
                                <CardDescription>
                                    Filtra pedidos por estado y gestionaos desde aqui.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={orderFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setOrderFilter('all')}
                                >
                                    Todos
                                </Button>
                                <Button
                                    type="button"
                                    variant={orderFilter === 'pending' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setOrderFilter('pending')}
                                >
                                    Pendientes
                                </Button>
                                <Button
                                    type="button"
                                    variant={orderFilter === 'confirmed' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setOrderFilter('confirmed')}
                                >
                                    Confirmados
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {filteredRecentOrders.map((order) => (
                                <PendingOrderCard
                                    key={order.public_id}
                                    order={order}
                                />
                            ))}

                            {filteredRecentOrders.length === 0 && (
                                <Card>
                                    <CardContent>
                                        <p className="py-2 text-sm text-muted-foreground">
                                            No hay pedidos para el filtro seleccionado.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
