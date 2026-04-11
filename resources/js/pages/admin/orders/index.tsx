import { Head, useForm } from '@inertiajs/react';
import {
    Download,
    Eye,
    Minus,
    PencilLine,
    Plus,
    Search,
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
import OrderExportController from '@/actions/App/Http/Controllers/Admin/OrderExportController';
import {
    destroy as destroyAdminOrder,
    index as adminOrdersIndex,
    signature as adminOrderSignature,
    update as updateAdminOrder,
} from '@/routes/admin/orders';

type Product = {
    id: number;
    product_id: number;
    product_name: string | null;
    original_price: string;
    default_discount_percent: string;
    packaging_multiple: number;
};

type Provider = {
    id: number;
    company_name: string;
    products: Product[];
};

type OrderItem = {
    id: number;
    product_id: number | null;
    product_name: string;
    quantity: number;
    unit_original_price: string;
    unit_special_price: string;
    discount_percent: string;
    line_special_total: string;
};

type Order = {
    public_id: string;
    order_number: number;
    provider_id: number;
    provider_name: string | null;
    status: string;
    customer_email: string | null;
    subtotal_original: string;
    subtotal_special: string;
    total_discount: string;
    created_at: string | null;
    confirmed_at: string | null;
    signature_url: string;
    can_edit: boolean;
    can_delete: boolean;
    items: OrderItem[];
};

type Props = {
    status?: string;
    orders: Order[];
    providers: Provider[];
};

type EditableItemState = { quantity: number };

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDateTime = (value: string | null) => {
    if (!value) return 'Sin fecha';
    return new Date(value).toLocaleString();
};

const getStatusLabel = (status: string) => {
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'pending') return 'Pendiente';
    return status;
};

const normalizeDiscountPercent = (value: number) =>
    Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, Math.round(value * 100) / 100));

const normalizeQuantity = (value: number, packagingMultiple: number) => {
    if (Number.isNaN(value) || value <= 0) return 0;
    const safe = Math.max(1, packagingMultiple);
    const rounded = Math.round(value);
    if (rounded <= safe) return safe;
    const remainder = rounded % safe;
    return remainder === 0 ? rounded : rounded + (safe - remainder);
};

const calculateUnitSpecialPrice = (originalPrice: number, discountPercent: number) =>
    Math.max(0, originalPrice * ((100 - normalizeDiscountPercent(discountPercent)) / 100));

function EditableOrderCard({ order, providers }: { order: Order; providers: Provider[] }) {
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [hasSignatureError, setHasSignatureError] = useState(false);
    const [orderItemsError, setOrderItemsError] = useState<string | null>(null);

    const providerProducts = useMemo(
        () => providers.find((p) => p.id === order.provider_id)?.products ?? [],
        [providers, order.provider_id],
    );

    const [editableItems, setEditableItems] = useState<Record<number, EditableItemState>>(() => {
        const state: Record<number, EditableItemState> = {};
        order.items.forEach((item) => {
            if (item.product_id !== null) {
                state[item.product_id] = { quantity: item.quantity };
            }
        });
        return state;
    });

    const form = useForm<{
        customer_email: string;
        customer_signature: string;
        items: { product_id: number; quantity: number }[];
    }>({
        customer_email: order.customer_email ?? '',
        customer_signature: '',
        items: [],
    });

    const selectedProducts = useMemo(() => {
        return providerProducts
            .map((product) => {
                const quantity = editableItems[product.product_id]?.quantity ?? 0;
                const discountPercent = Number(product.default_discount_percent);
                const originalPrice = Number(product.original_price);
                const unitSpecialPrice = calculateUnitSpecialPrice(originalPrice, discountPercent);
                return {
                    ...product,
                    quantity,
                    discount_percent: normalizeDiscountPercent(discountPercent),
                    unit_special_price: unitSpecialPrice,
                    line_special_total: unitSpecialPrice * quantity,
                    line_original_total: originalPrice * quantity,
                };
            })
            .filter((p) => p.quantity > 0);
    }, [providerProducts, editableItems]);

    const estimatedSpecialTotal = selectedProducts.reduce((t, p) => t + p.line_special_total, 0);
    const estimatedDiscountTotal = selectedProducts.reduce((t, p) => t + p.line_original_total - p.line_special_total, 0);

    const updateItemQuantity = (productId: number, rawQuantity: number) => {
        const product = providerProducts.find((p) => p.product_id === productId);
        if (!product) return;
        const safe = Math.max(1, product.packaging_multiple);
        setEditableItems((curr) => ({ ...curr, [productId]: { quantity: normalizeQuantity(rawQuantity, safe) } }));
    };

    const increaseQuantity = (productId: number) => {
        const product = providerProducts.find((p) => p.product_id === productId);
        if (!product) return;
        const safe = Math.max(1, product.packaging_multiple);
        updateItemQuantity(productId, (editableItems[productId]?.quantity ?? 0) + safe);
    };

    const decreaseQuantity = (productId: number) => {
        const product = providerProducts.find((p) => p.product_id === productId);
        if (!product) return;
        const safe = Math.max(1, product.packaging_multiple);
        const next = (editableItems[productId]?.quantity ?? 0) - safe;
        setEditableItems((curr) => ({ ...curr, [productId]: { quantity: Math.max(0, next) } }));
    };

    const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const items = selectedProducts.map((p) => ({ product_id: p.product_id, quantity: p.quantity }));
        if (items.length === 0) {
            setOrderItemsError('Debes seleccionar al menos un producto.');
            return;
        }
        setOrderItemsError(null);
        form.transform((data) => ({ ...data, items }));
        form.patch(updateAdminOrder.url({ order: order.public_id }), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('customer_signature', 'items');
                setIsEditing(false);
            },
        });
    };

    const handleDelete = () => {
        if (!window.confirm(`Se eliminara la Orden Nro ${order.order_number}. Esta accion no se puede deshacer.`)) return;
        form.delete(destroyAdminOrder.url({ order: order.public_id }), { preserveScroll: true });
    };

    const signatureUrl = adminOrderSignature.url({ order: order.public_id });

    return (
        <Card className="overflow-hidden border-cyan-500/20 shadow-sm">
            <CardHeader className="gap-4 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>Orden Nro {order.order_number}</CardTitle>
                        <CardDescription>
                            {order.provider_name} •{' '}
                            {order.customer_email ?? 'Sin correo registrado'}
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
                        onClick={() => setIsViewing((v) => !v)}
                    >
                        <Eye />
                        Ver
                    </Button>
                    <Button
                        type="button"
                        variant={isEditing ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => { setIsEditing((e) => !e); setIsViewing(true); }}
                        disabled={!order.can_edit || providerProducts.length === 0}
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
                    <div className="grid gap-3 text-sm md:grid-cols-5">
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Creado</p>
                            <p className="font-medium">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Confirmado</p>
                            <p className="font-medium">{formatDateTime(order.confirmed_at)}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Base</p>
                            <p className="font-medium">${formatCurrency(Number(order.subtotal_original))}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-medium">${formatCurrency(Number(order.subtotal_special))}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">Ahorro</p>
                            <p className="font-medium text-emerald-700 dark:text-emerald-300">
                                ${formatCurrency(Number(order.total_discount))}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Firma del cliente</p>
                            {!hasSignatureError && (
                                <img
                                    src={signatureUrl}
                                    alt={`Firma Orden Nro ${order.order_number}`}
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
                                    <div key={item.id} className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                                        <p className="font-medium">{item.product_name}</p>
                                        <p className="text-muted-foreground">
                                            Cantidad: {item.quantity} • -{Number(item.discount_percent).toFixed(2)}%
                                        </p>
                                        <p className="text-muted-foreground">
                                            {Number(item.discount_percent) > 0 ? (
                                                <>
                                                    <span className="line-through">${formatCurrency(Number(item.unit_original_price))}</span>
                                                    <span className="mx-1">{'->'}</span>
                                                </>
                                            ) : null}
                                            Unitario ${formatCurrency(Number(item.unit_special_price))}
                                        </p>
                                        <p className="font-medium">Total ${formatCurrency(Number(item.line_special_total))}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="space-y-4 border-t border-dashed border-cyan-500/30 bg-cyan-500/3">
                    {providerProducts.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Este proveedor no tiene productos activos disponibles para editar.
                        </p>
                    )}
                    <form onSubmit={submitUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor={`customer-email-${order.public_id}`} className="text-sm font-medium">
                                Correo del cliente{' '}
                                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                            </label>
                            <Input
                                id={`customer-email-${order.public_id}`}
                                type="email"
                                value={form.data.customer_email}
                                onChange={(e) => form.setData('customer_email', e.target.value)}
                                placeholder="cliente@correo.com"
                            />
                            <InputError message={form.errors.customer_email} />
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Firma actual</p>
                            {!hasSignatureError && (
                                <img
                                    src={signatureUrl}
                                    alt={`Firma actual Orden Nro ${order.order_number}`}
                                    className="h-40 w-full rounded-md border object-contain"
                                    onError={() => setHasSignatureError(true)}
                                />
                            )}
                        </div>

                        <OrderSignaturePad
                            value={form.data.customer_signature}
                            onChange={(sig) => form.setData('customer_signature', sig)}
                            error={form.errors.customer_signature}
                        />

                        <p className="text-xs text-muted-foreground">
                            Si necesitas reemplazar la firma, dibuja una nueva. Si no, se conserva la firma actual.
                        </p>

                        <div className="grid gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm md:grid-cols-3">
                            <p>Seleccionados: <span className="font-medium">{selectedProducts.length}</span></p>
                            <p>Total estimado: <span className="font-medium">${formatCurrency(estimatedSpecialTotal)}</span></p>
                            <p>Ahorro: <span className="font-medium text-emerald-700 dark:text-emerald-300">${formatCurrency(estimatedDiscountTotal)}</span></p>
                        </div>

                        <div className="grid gap-3">
                            {providerProducts.map((product) => {
                                const quantity = editableItems[product.product_id]?.quantity ?? 0;
                                const normalizedDiscount = normalizeDiscountPercent(Number(product.default_discount_percent));
                                const originalPrice = Number(product.original_price);
                                const unitSpecialPrice = calculateUnitSpecialPrice(originalPrice, normalizedDiscount);
                                const safePackaging = Math.max(1, product.packaging_multiple);

                                return (
                                    <div
                                        key={product.id}
                                        className={`grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_260px] ${
                                            quantity > 0
                                                ? 'border-cyan-500/50 bg-cyan-500/5'
                                                : 'border-slate-200/80 bg-background dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">{product.product_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Embalaje x{safePackaging}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {normalizedDiscount > 0 ? (
                                                    <>
                                                        <span className="line-through">${formatCurrency(originalPrice)}</span>
                                                        <span className="mx-1">{'->'}</span>
                                                        <span className="font-medium text-foreground">${formatCurrency(unitSpecialPrice)}</span>
                                                        <span className="ml-2">(-{normalizedDiscount.toFixed(2)}%)</span>
                                                    </>
                                                ) : (
                                                    <span className="font-medium text-foreground">${formatCurrency(originalPrice)}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="space-y-1">
                                                <label
                                                    htmlFor={`qty-${order.public_id}-${product.product_id}`}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Cantidad
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => decreaseQuantity(product.product_id)}
                                                        disabled={quantity <= 0}
                                                    >
                                                        <Minus className="size-4" />
                                                    </Button>
                                                    <Input
                                                        id={`qty-${order.public_id}-${product.product_id}`}
                                                        type="number"
                                                        min={0}
                                                        step={safePackaging}
                                                        value={quantity}
                                                        onChange={(e) =>
                                                            updateItemQuantity(product.product_id, Number(e.target.value))
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => increaseQuantity(product.product_id)}
                                                    >
                                                        <Plus className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {orderItemsError && <p className="text-sm text-destructive">{orderItemsError}</p>}
                        <InputError message={form.errors.items} />

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={form.processing}>
                                Guardar cambios
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}
        </Card>
    );
}

export default function AdminOrdersIndexPage({ status, orders, providers }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase();
        return orders.filter((order) => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            const matchesSearch =
                term === '' ||
                String(order.order_number).includes(term) ||
                (order.customer_email ?? '').toLowerCase().includes(term) ||
                (order.provider_name ?? '').toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        });
    }, [orders, search, statusFilter]);

    const summary = useMemo(() => ({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
    }), [orders]);

    return (
        <>
            <Head title="Pedidos" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <Heading
                        title="Pedidos"
                        description="Visualiza, edita y elimina cualquier pedido del sistema."
                    />
                    <Button asChild variant="default">
                        <a href={OrderExportController.url()} download>
                            <Download />
                            Descargar pedidos (.xlsx)
                        </a>
                    </Button>
                </div>

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardDescription>Total de pedidos</CardDescription>
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
                            <CardDescription>Confirmados</CardDescription>
                            <CardTitle>{summary.confirmed}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Busca por numero, correo o proveedor, y filtra por estado.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Ej. 12, cliente@correo.com o nombre de proveedor"
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
                                Todos
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
                                Confirmados
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredOrders.map((order) => (
                        <EditableOrderCard
                            key={order.public_id}
                            order={order}
                            providers={providers}
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

AdminOrdersIndexPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Pedidos', href: adminOrdersIndex() },
    ],
};
