import { Head, Link, useForm } from '@inertiajs/react';
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
import { index as adminCategoriesIndex } from '@/routes/admin/categories';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminProviderProductsIndex } from '@/routes/admin/provider-products';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminUsersIndex } from '@/routes/admin/users';
import {
    resendOtp,
    store as storeProviderOrder,
    verifyOtp,
} from '@/routes/provider/orders';
import { dashboard } from '@/routes';

type AdminSummary = {
    categories_count: number;
    products_count: number;
    providers_count: number;
    pending_orders_count: number;
    confirmed_orders_count: number;
    recent_orders: {
        public_id: string;
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
    products: {
        id: number;
        product_id: number;
        product_name: string | null;
        sku: string | null;
        category_name: string | null;
        original_price: string;
        special_price: string;
        discount_type: string | null;
        discount_value: string;
    }[];
    recent_orders: {
        public_id: string;
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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle>Pedido {order.public_id}</CardTitle>
                        <CardDescription>
                            Cliente: {order.customer_email}
                        </CardDescription>
                    </div>
                    <Badge
                        variant={
                            order.status === 'confirmed' ? 'default' : 'outline'
                        }
                    >
                        {order.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                    Total: ${order.subtotal_special} | Ahorro: ${order.total_discount}
                </div>

                {order.status === 'pending' && (
                    <>
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
                                    Reenviar OTP
                                </Button>
                            </div>
                        </form>

                        <div className="text-xs text-muted-foreground">
                            Intentos restantes: {order.otp_attempts_remaining} | Reenvios usados: {order.otp_resend_count ?? 0}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ status, adminSummary, providerWorkspace }: Props) {
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [orderItemsError, setOrderItemsError] = useState<string | null>(null);

    const orderForm = useForm<{
        customer_email: string;
        items: {
            product_id: number;
            quantity: number;
        }[];
    }>({
        customer_email: '',
        items: [],
    });

    const selectedProducts = useMemo(() => {
        if (providerWorkspace === null) {
            return [];
        }

        return providerWorkspace.products
            .map((product) => ({
                ...product,
                quantity: quantities[product.product_id] ?? 0,
            }))
            .filter((product) => product.quantity > 0);
    }, [providerWorkspace, quantities]);

    const estimatedTotal = selectedProducts.reduce((total, product) => {
        return total + Number(product.special_price) * product.quantity;
    }, 0);

    const handleQuantityChange = (productId: number, quantity: number) => {
        setQuantities((current) => ({
            ...current,
            [productId]: Number.isNaN(quantity) ? 0 : Math.max(0, quantity),
        }));
    };

    const submitOrder = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const items = selectedProducts.map((product) => ({
            product_id: product.product_id,
            quantity: product.quantity,
        }));

        if (items.length === 0) {
            setOrderItemsError('Debes seleccionar al menos un producto con cantidad mayor a cero.');
            return;
        }

        setOrderItemsError(null);

        orderForm.transform((data) => ({
            ...data,
            items,
        }));

        orderForm.post(storeProviderOrder.url(), {
            preserveScroll: true,
            onSuccess: () => {
                orderForm.reset('customer_email', 'items');
                setQuantities({});
            },
        });
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
                        <div className="grid gap-4 md:grid-cols-5">
                            <Card>
                                <CardHeader>
                                    <CardDescription>Categorias</CardDescription>
                                    <CardTitle>{adminSummary.categories_count}</CardTitle>
                                </CardHeader>
                            </Card>
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
                                    <Link href={adminCategoriesIndex()}>Categorias</Link>
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
                                                {order.public_id} • {order.status}
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
                        <Card>
                            <CardHeader>
                                <CardTitle>{providerWorkspace.provider.company_name}</CardTitle>
                                <CardDescription>
                                    {providerWorkspace.provider.stand_label}
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Crear pedido</CardTitle>
                                <CardDescription>
                                    Selecciona productos asignados y confirma con OTP.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitOrder} className="space-y-4">
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="customer-email"
                                            className="text-sm font-medium"
                                        >
                                            Correo del cliente
                                        </label>
                                        <Input
                                            id="customer-email"
                                            type="email"
                                            value={orderForm.data.customer_email}
                                            onChange={(event) =>
                                                orderForm.setData(
                                                    'customer_email',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="cliente@correo.com"
                                        />
                                        <InputError
                                            message={orderForm.errors.customer_email}
                                        />
                                    </div>

                                    <div className="grid gap-3">
                                        {providerWorkspace.products.map((product) => (
                                            <div
                                                key={product.id}
                                                className="grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_130px]"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {product.product_name} ({product.sku})
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {product.category_name} • Original ${product.original_price} • Especial ${product.special_price}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor={`quantity-${product.product_id}`}
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        Cantidad
                                                    </label>
                                                    <Input
                                                        id={`quantity-${product.product_id}`}
                                                        type="number"
                                                        min={0}
                                                        max={999}
                                                        value={
                                                            quantities[
                                                                product.product_id
                                                            ] ?? 0
                                                        }
                                                        onChange={(event) =>
                                                            handleQuantityChange(
                                                                product.product_id,
                                                                Number(
                                                                    event.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {orderItemsError && (
                                        <p className="text-sm text-destructive">
                                            {orderItemsError}
                                        </p>
                                    )}

                                    <InputError message={orderForm.errors.items} />

                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                        Productos seleccionados: {selectedProducts.length} | Total estimado: ${estimatedTotal.toFixed(2)}
                                    </div>

                                    <Button type="submit" disabled={orderForm.processing}>
                                        Generar pedido y enviar OTP
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {providerWorkspace.recent_orders.map((order) => (
                                <PendingOrderCard
                                    key={order.public_id}
                                    order={order}
                                />
                            ))}

                            {providerWorkspace.recent_orders.length === 0 && (
                                <Card>
                                    <CardContent>
                                        <p className="py-2 text-sm text-muted-foreground">
                                            Aun no has generado pedidos.
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
