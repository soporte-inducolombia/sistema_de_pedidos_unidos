import { Head, Link, useForm } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    ClipboardList,
    PackageSearch,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminProviderProductsIndex } from '@/routes/admin/provider-products';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminUsersIndex } from '@/routes/admin/users';
import {
    index as providerOrdersIndex,
    resendOtp,
    verifyOtp,
} from '@/routes/provider/orders';

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
        provider_email: string | null;
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
        total_savings: number;
    };
    recent_orders: {
        public_id: string;
        order_number: number;
        status: string;
        customer_email: string;
        subtotal_special: string;
        total_discount: string;
        created_at: string | null;
        confirmed_at: string | null;
        otp_expires_at: string | null;
        otp_attempts_remaining: number;
        otp_resend_count: number | null;
        can_resend_otp: boolean;
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
    const verifyForm = useForm<{ code: string }>({
        code: '',
    });

    const resendForm = useForm<Record<string, never>>({});

    const submitVerification = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        verifyForm.post(verifyOtp.url({ order: order.public_id }), {
            preserveScroll: true,
            onSuccess: () => {
                verifyForm.reset();
            },
        });
    };

    const triggerResend = () => {
        resendForm.post(resendOtp.url({ order: order.public_id }), {
            preserveScroll: true,
        });
    };

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
                            Cliente: {order.customer_email}
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
                        <p className="font-medium">${order.subtotal_special}</p>
                    </div>
                    <div className="rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs text-muted-foreground">Ahorro</p>
                        <p className="font-medium">${order.total_discount}</p>
                    </div>
                    <div className="rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50 md:col-span-2">
                        <p className="text-xs text-muted-foreground">Creado</p>
                        <p className="font-medium">{formatDateTime(order.created_at)}</p>
                    </div>
                </div>

                {order.status === 'pending' && (
                    <>
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                            Expira: {formatDateTime(order.otp_expires_at)}
                        </div>

                        <form onSubmit={submitVerification} className="space-y-2">
                            <label className="text-sm font-medium" htmlFor={`otp-${order.public_id}`}>
                                Codigo OTP
                            </label>
                            <Input
                                id={`otp-${order.public_id}`}
                                value={verifyForm.data.code}
                                onChange={(event) =>
                                    verifyForm.setData('code', event.target.value)
                                }
                                placeholder="Ingresa el codigo de 6 digitos"
                                maxLength={6}
                            />
                            <InputError message={verifyForm.errors.code} />

                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="submit" disabled={verifyForm.processing}>
                                    <CheckCircle2 />
                                    Confirmar pedido
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerResend}
                                    disabled={
                                        resendForm.processing ||
                                        !order.can_resend_otp
                                    }
                                >
                                    <Clock3 />
                                    Reenviar OTP
                                </Button>
                            </div>
                        </form>

                        <div className="text-xs text-muted-foreground">
                            Intentos restantes: {order.otp_attempts_remaining} | Reenvios usados: {order.otp_resend_count ?? 0}
                        </div>
                    </>
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
        total_savings: 0,
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
                                                {order.customer_email} - {order.provider_name} ({order.provider_email})
                                            </div>
                                            <div className="text-muted-foreground">
                                                Ahorro: ${order.total_discount}
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
                                    <CardDescription>Ahorro acumulado</CardDescription>
                                    <CardTitle>${providerStats.total_savings.toFixed(2)}</CardTitle>
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
                                    Filtra pedidos por estado y gestiona OTP pendientes.
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
