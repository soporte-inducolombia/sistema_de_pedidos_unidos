import { Head, Link, useForm } from '@inertiajs/react';
import {
    Eye,
    PencilLine,
    Plus,
    RefreshCw,
    ReceiptText,
    Search,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import OrderSignaturePad from '@/components/order-signature-pad';
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
import {
    create as createProviderOrder,
    destroy as destroyProviderOrder,
    index as providerOrdersIndex,
    resendOtp as resendProviderOrderOtp,
    signature as providerOrderSignature,
    update as updateProviderOrder,
    verifyOtp as verifyProviderOrderOtp,
} from '@/routes/provider/orders';

type ProviderWorkspace = {
    provider: {
        company_name: string;
        stand_label: string;
    };
    products: {
        id: number;
        product_id: number;
        product_name: string | null;
        code: string | null;
        barcode: string | null;
        special_price: string;
        discount_percent: string;
    }[];
    orders: {
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
        signature_url: string;
        can_edit: boolean;
        can_delete: boolean;
        items: {
            id: number;
            product_id: number | null;
            product_name: string;
            code: string | null;
            quantity: number;
            unit_special_price: string;
            line_special_total: string;
        }[];
    }[];
};

type Props = {
    status?: string;
    pendingOtpOrderPublicId?: string | null;
    providerWorkspace: ProviderWorkspace;
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

    if (status === 'expired') {
        return 'Expirado';
    }

    return status;
};

function EditableOrderCard({
    order,
    products,
    pendingOtpOrderPublicId,
}: {
    order: ProviderWorkspace['orders'][number];
    products: ProviderWorkspace['products'];
    pendingOtpOrderPublicId?: string | null;
}) {
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [orderItemsError, setOrderItemsError] = useState<string | null>(null);
    const [hasSignatureError, setHasSignatureError] = useState(false);
    const [isOtpPanelDismissed, setIsOtpPanelDismissed] = useState(false);

    const [quantities, setQuantities] = useState<Record<number, number>>(() => {
        const initialQuantities: Record<number, number> = {};

        order.items.forEach((item) => {
            if (item.product_id !== null) {
                initialQuantities[item.product_id] = item.quantity;
            }
        });

        return initialQuantities;
    });

    const form = useForm<{
        customer_email: string;
        customer_signature: string;
        items: {
            product_id: number;
            quantity: number;
        }[];
    }>({
        customer_email: order.customer_email,
        customer_signature: '',
        items: [],
    });

    const verifyOtpForm = useForm<{
        code: string;
    }>({
        code: '',
    });

    const resendOtpForm = useForm<Record<string, never>>({});

    const isOtpActionableOrder =
        order.status === 'pending' || order.status === 'expired';
    const requiresNewOtp = order.status === 'expired';
    const isFocusedOtpOrder =
        isOtpActionableOrder && pendingOtpOrderPublicId === order.public_id;
    const verifyOtpGeneralError = (
        verifyOtpForm.errors as Record<string, string | undefined>
    ).order;

    const selectedProducts = useMemo(() => {
        return products
            .map((product) => ({
                ...product,
                quantity: quantities[product.product_id] ?? 0,
            }))
            .filter((product) => product.quantity > 0);
    }, [products, quantities]);

    const estimatedTotal = selectedProducts.reduce((total, product) => {
        return total + Number(product.special_price) * product.quantity;
    }, 0);

    const handleQuantityChange = (productId: number, quantity: number) => {
        setQuantities((current) => ({
            ...current,
            [productId]: Number.isNaN(quantity) ? 0 : Math.max(0, quantity),
        }));
    };

    const toggleView = () => {
        setIsViewing((previous) => !previous);
    };

    const toggleEdit = () => {
        if (!order.can_edit) {
            return;
        }

        setIsEditing((previous) => !previous);
        setIsViewing(true);
    };

    const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const items = selectedProducts.map((product) => ({
            product_id: product.product_id,
            quantity: product.quantity,
        }));

        if (items.length === 0) {
            setOrderItemsError('Debes seleccionar al menos un producto para actualizar la orden.');

            return;
        }

        setOrderItemsError(null);

        form.transform((data) => ({
            ...data,
            items,
        }));

        form.patch(updateProviderOrder.url({ order: order.public_id }), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('customer_signature', 'items');
                setIsEditing(false);
            },
        });
    };

    const handleDelete = () => {
        if (!order.can_delete) {
            return;
        }

        if (!window.confirm(`Se eliminara la Orden Nro ${order.order_number}. Esta accion no se puede deshacer.`)) {
            return;
        }

        form.delete(destroyProviderOrder.url({ order: order.public_id }), {
            preserveScroll: true,
        });
    };

    const submitOtpVerification = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        verifyOtpForm.post(verifyProviderOrderOtp.url({ order: order.public_id }), {
            preserveScroll: true,
            onSuccess: () => {
                verifyOtpForm.reset();
                setIsOtpPanelDismissed(false);
            },
        });
    };

    const resendOtp = () => {
        resendOtpForm.post(resendProviderOrderOtp.url({ order: order.public_id }), {
            preserveScroll: true,
            onSuccess: () => {
                verifyOtpForm.reset('code');
                setIsOtpPanelDismissed(false);
            },
        });
    };

    const signatureUrl = providerOrderSignature.url({ order: order.public_id });

    return (
        <Card className="overflow-hidden border-cyan-500/20 shadow-sm">
            <CardHeader className="gap-4 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>Orden Nro {order.order_number}</CardTitle>
                        <CardDescription>
                            Cliente: {order.customer_email}
                        </CardDescription>
                    </div>
                    <Badge variant={order.status === 'confirmed' ? 'default' : 'outline'}>
                        {getStatusLabel(order.status)}
                    </Badge>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant={isViewing ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={toggleView}
                    >
                        <Eye />
                        Ver
                    </Button>
                    <Button
                        type="button"
                        variant={isEditing ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={toggleEdit}
                        disabled={!order.can_edit}
                    >
                        <PencilLine />
                        Editar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={form.processing || !order.can_delete}
                    >
                        <Trash2 />
                        Eliminar
                    </Button>
                </div>
            </CardHeader>

            {isViewing && (
                <CardContent className="space-y-4 border-t border-cyan-500/15 bg-background/80">
                    <div className="grid gap-3 text-sm md:grid-cols-4">
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Creado</p>
                            <p className="font-medium">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Confirmado</p>
                            <p className="font-medium">{formatDateTime(order.confirmed_at)}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-medium">${order.subtotal_special}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Ahorro</p>
                            <p className="font-medium">${order.total_discount}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Firma del cliente</p>
                            {!hasSignatureError && (
                                <img
                                    src={signatureUrl}
                                    alt={`Firma de la Orden Nro ${order.order_number}`}
                                    className="h-48 w-full rounded-md border object-contain"
                                    onError={() => setHasSignatureError(true)}
                                />
                            )}
                            {hasSignatureError && (
                                <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                                    No fue posible cargar la firma de esta orden.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Items de la orden</p>
                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-md border bg-muted/20 px-3 py-2 text-xs"
                                    >
                                        <p className="font-medium">
                                            {item.product_name} ({item.code ?? 'Sin codigo'})
                                        </p>
                                        <p className="text-muted-foreground">
                                            Cantidad: {item.quantity}
                                        </p>
                                        <p className="text-muted-foreground">
                                            Unitario: ${item.unit_special_price} • Total: ${item.line_special_total}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="space-y-4 border-t border-dashed border-cyan-500/30 bg-cyan-500/3">
                    <form onSubmit={submitUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor={`customer-email-${order.public_id}`}
                                className="text-sm font-medium"
                            >
                                Correo del cliente
                            </label>
                            <Input
                                id={`customer-email-${order.public_id}`}
                                type="email"
                                value={form.data.customer_email}
                                onChange={(event) =>
                                    form.setData('customer_email', event.target.value)
                                }
                                placeholder="cliente@correo.com"
                            />
                            <InputError message={form.errors.customer_email} />
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Firma actual</p>
                            {!hasSignatureError && (
                                <img
                                    src={signatureUrl}
                                    alt={`Firma actual de la Orden Nro ${order.order_number}`}
                                    className="h-40 w-full rounded-md border object-contain"
                                    onError={() => setHasSignatureError(true)}
                                />
                            )}
                            {hasSignatureError && (
                                <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                                    No fue posible cargar la firma actual.
                                </div>
                            )}
                        </div>

                        <OrderSignaturePad
                            value={form.data.customer_signature}
                            onChange={(signature) => form.setData('customer_signature', signature)}
                            error={form.errors.customer_signature}
                        />

                        <p className="text-xs text-muted-foreground">
                            Si necesitas reemplazar la firma, dibuja una nueva. Si no, se conserva la firma actual.
                        </p>

                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                            Productos seleccionados: {selectedProducts.length} | Total estimado: ${estimatedTotal.toFixed(2)}
                        </div>

                        <div className="grid gap-3">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className={`grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_130px] ${
                                        (quantities[product.product_id] ?? 0) > 0
                                            ? 'border-cyan-500/50 bg-cyan-500/5'
                                            : 'border-slate-200/80 bg-background dark:border-slate-800'
                                    }`}
                                >
                                    <div>
                                        <p className="font-medium">
                                            {product.product_name} ({product.code})
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Barras {product.barcode ?? 'Sin barras'} • Especial ${product.special_price}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <label
                                            htmlFor={`quantity-${order.public_id}-${product.product_id}`}
                                            className="text-xs text-muted-foreground"
                                        >
                                            Cantidad
                                        </label>
                                        <Input
                                            id={`quantity-${order.public_id}-${product.product_id}`}
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={quantities[product.product_id] ?? 0}
                                            onChange={(event) =>
                                                handleQuantityChange(
                                                    product.product_id,
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {orderItemsError && (
                            <p className="text-sm text-destructive">{orderItemsError}</p>
                        )}

                        <InputError message={form.errors.items} />

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={form.processing || !order.can_edit}>
                                Guardar cambios y reenviar OTP
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}

            {isOtpActionableOrder && !isEditing && !isOtpPanelDismissed && (
                <CardContent
                    className={`space-y-4 border-t ${
                        isFocusedOtpOrder
                            ? 'border-amber-500/40 bg-amber-500/8'
                            : 'border-cyan-500/15 bg-cyan-500/4'
                    }`}
                >
                    <div className="space-y-1">
                        <p className="text-sm font-medium">
                            {requiresNewOtp
                                ? 'El OTP expiro. Reenvia uno nuevo para continuar'
                                : 'Confirma el OTP para completar esta orden'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {requiresNewOtp
                                ? 'Cuando llegue el nuevo codigo al cliente, podras confirmarlo desde aqui.'
                                : 'Puedes confirmar ahora o dejarla pendiente para validarla luego.'}
                        </p>
                    </div>

                    <div className="grid gap-3 text-xs md:grid-cols-3">
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-muted-foreground">Expira</p>
                            <p className="font-medium">{formatDateTime(order.otp_expires_at)}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-muted-foreground">Intentos restantes</p>
                            <p className="font-medium">{order.otp_attempts_remaining}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-muted-foreground">Reenvios OTP</p>
                            <p className="font-medium">{order.otp_resend_count ?? 0}</p>
                        </div>
                    </div>

                    <form onSubmit={submitOtpVerification} className="space-y-3">
                        <div className="space-y-2">
                            <label
                                htmlFor={`otp-code-${order.public_id}`}
                                className="text-sm font-medium"
                            >
                                Codigo OTP
                            </label>
                            <Input
                                id={`otp-code-${order.public_id}`}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={verifyOtpForm.data.code}
                                onChange={(event) =>
                                    verifyOtpForm.setData('code', event.target.value.replace(/\D/g, '').slice(0, 6))
                                }
                                placeholder="Ingresa el codigo de 6 digitos"
                            />
                            <InputError message={verifyOtpForm.errors.code} />
                            <InputError message={verifyOtpGeneralError} />
                            <InputError message={resendOtpForm.errors.code} />
                            <InputError message={resendOtpForm.errors.order} />
                            {requiresNewOtp && (
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    El codigo anterior vencio. Reenvia OTP para recibir uno nuevo.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                disabled={
                                    verifyOtpForm.processing ||
                                    resendOtpForm.processing ||
                                    requiresNewOtp
                                }
                            >
                                <ShieldCheck className="size-4" />
                                Confirmar OTP
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resendOtp}
                                disabled={
                                    verifyOtpForm.processing ||
                                    resendOtpForm.processing ||
                                    !order.can_resend_otp
                                }
                            >
                                <RefreshCw className="size-4" />
                                Reenviar OTP
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOtpPanelDismissed(true)}
                                disabled={verifyOtpForm.processing || resendOtpForm.processing}
                            >
                                Dejar pendiente
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}

            {isOtpActionableOrder && !isEditing && isOtpPanelDismissed && (
                <CardContent className="border-t border-cyan-500/15 bg-cyan-500/3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-cyan-500/25 px-3 py-2 text-xs text-muted-foreground">
                        <span>OTP pendiente para esta orden.</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsOtpPanelDismissed(false)}
                        >
                            Ingresar OTP ahora
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default function ProviderOrdersIndexPage({
    status,
    pendingOtpOrderPublicId,
    providerWorkspace,
}: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'expired'>(
        'all',
    );

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase();

        return providerWorkspace.orders.filter((order) => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            const matchesSearch =
                term === '' ||
                String(order.order_number).includes(term) ||
                order.customer_email.toLowerCase().includes(term);

            return matchesStatus && matchesSearch;
        });
    }, [providerWorkspace.orders, search, statusFilter]);

    const summary = useMemo(() => {
        const pending = providerWorkspace.orders.filter(
            (order) => order.status === 'pending',
        ).length;
        const confirmed = providerWorkspace.orders.filter(
            (order) => order.status === 'confirmed',
        ).length;

        return {
            total: providerWorkspace.orders.length,
            pending,
            confirmed,
        };
    }, [providerWorkspace.orders]);

    return (
        <>
            <Head title="Pedidos" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Pedidos"
                    description="Gestiona pedidos con firma del cliente, OTP y control total por orden"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                <Card className="border-cyan-500/25 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ReceiptText className="size-5 text-cyan-600" />
                            {providerWorkspace.provider.company_name}
                        </CardTitle>
                        <CardDescription>
                            {providerWorkspace.provider.stand_label}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href={createProviderOrder()}>
                                <Plus className="size-4" />
                                Nuevo pedido
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={dashboard()}>Volver al dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardDescription>Total de ordenes</CardDescription>
                            <CardTitle>{summary.total}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Pendientes</CardDescription>
                            <CardTitle>{summary.pending}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Confirmadas</CardDescription>
                            <CardTitle>{summary.confirmed}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>
                            Busca por numero de orden o correo, y filtra por estado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. 12 o cliente@correo.com"
                                className="pl-9"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                            >
                                Todas
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('pending')}
                            >
                                Pendientes
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('confirmed')}
                            >
                                Confirmadas
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('expired')}
                            >
                                Expiradas
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredOrders.map((order) => (
                        <EditableOrderCard
                            key={order.public_id}
                            order={order}
                            products={providerWorkspace.products}
                            pendingOtpOrderPublicId={pendingOtpOrderPublicId}
                        />
                    ))}

                    {filteredOrders.length === 0 && (
                        <Card>
                            <CardContent>
                                <p className="py-2 text-sm text-muted-foreground">
                                    No hay pedidos para los filtros seleccionados.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

ProviderOrdersIndexPage.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pedidos',
            href: providerOrdersIndex(),
        },
    ],
};
