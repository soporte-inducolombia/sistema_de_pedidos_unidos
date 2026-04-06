import { Head, Link, useForm } from '@inertiajs/react';
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    ListChecks,
    Mail,
    PackageSearch,
    Search,
    ShoppingCart,
    TicketPercent,
    UserRound,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import OrderSignaturePad from '@/components/order-signature-pad';
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
    index as providerOrdersIndex,
    store as storeProviderOrder,
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
};

type Props = {
    status?: string;
    providerWorkspace: ProviderWorkspace;
};

export default function ProviderCreateOrderPage({ status, providerWorkspace }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [orderItemsError, setOrderItemsError] = useState<string | null>(null);
    const [customerInfoError, setCustomerInfoError] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');

    const orderForm = useForm<{
        customer_email: string;
        customer_signature: string;
        items: {
            product_id: number;
            quantity: number;
        }[];
    }>({
        customer_email: '',
        customer_signature: '',
        items: [],
    });

    const selectedProducts = useMemo(() => {
        return providerWorkspace.products
            .map((product) => ({
                ...product,
                quantity: quantities[product.product_id] ?? 0,
            }))
            .filter((product) => product.quantity > 0);
    }, [providerWorkspace.products, quantities]);

    const estimatedTotal = selectedProducts.reduce((total, product) => {
        return total + Number(product.special_price) * product.quantity;
    }, 0);

    const filteredProviderProducts = useMemo(() => {
        const term = productSearch.trim().toLowerCase();

        if (!term) {
            return providerWorkspace.products;
        }

        return providerWorkspace.products.filter((product) => {
            return (
                (product.product_name ?? '').toLowerCase().includes(term) ||
                (product.code ?? '').toLowerCase().includes(term) ||
                (product.barcode ?? '').toLowerCase().includes(term)
            );
        });
    }, [productSearch, providerWorkspace.products]);

    const handleQuantityChange = (productId: number, quantity: number) => {
        setQuantities((current) => ({
            ...current,
            [productId]: Number.isNaN(quantity) ? 0 : Math.max(0, quantity),
        }));
    };

    const isProductSelected = (productId: number): boolean => {
        return (quantities[productId] ?? 0) > 0;
    };

    const toggleProductSelection = (productId: number) => {
        setQuantities((current) => {
            if ((current[productId] ?? 0) > 0) {
                return {
                    ...current,
                    [productId]: 0,
                };
            }

            return {
                ...current,
                [productId]: 1,
            };
        });
    };

    const goToStepTwo = () => {
        if (selectedProducts.length === 0) {
            setOrderItemsError('Debes seleccionar al menos un producto con cantidad mayor a cero.');

            return;
        }

        setOrderItemsError(null);
        setStep(2);
    };

    const goToStepThree = () => {
        if (orderForm.data.customer_email.trim().length === 0) {
            setCustomerInfoError('Debes ingresar el correo del cliente para continuar.');

            return;
        }

        if (!orderForm.data.customer_signature) {
            setCustomerInfoError('Debes capturar la firma del cliente para continuar.');

            return;
        }

        setCustomerInfoError(null);
        setStep(3);
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
                orderForm.reset('customer_email', 'customer_signature', 'items');
                setQuantities({});
                setProductSearch('');
                setOrderItemsError(null);
                setCustomerInfoError(null);
                setStep(1);
            },
        });
    };

    return (
        <>
            <Head title="Crear pedido" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Crear pedidos"
                    description="Flujo guiado: productos, cliente y confirmacion final con OTP"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="size-5 text-cyan-600" />
                            Nuevo pedido por pasos
                        </CardTitle>
                        <CardDescription>
                            Paso 1: productos. Paso 2: cliente y firma. Paso 3: confirmar y enviar OTP.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 grid gap-3 md:grid-cols-3">
                            <div className={`rounded-md border px-3 py-2 text-sm ${step === 1 ? 'border-cyan-500/50 bg-cyan-500/10' : 'bg-muted/30'}`}>
                                <p className="font-medium">Paso 1</p>
                                <p className="text-xs text-muted-foreground">Productos y cantidades</p>
                            </div>
                            <div className={`rounded-md border px-3 py-2 text-sm ${step === 2 ? 'border-cyan-500/50 bg-cyan-500/10' : 'bg-muted/30'}`}>
                                <p className="font-medium">Paso 2</p>
                                <p className="text-xs text-muted-foreground">Informacion del cliente</p>
                            </div>
                            <div className={`rounded-md border px-3 py-2 text-sm ${step === 3 ? 'border-cyan-500/50 bg-cyan-500/10' : 'bg-muted/30'}`}>
                                <p className="font-medium">Paso 3</p>
                                <p className="text-xs text-muted-foreground">Confirmar y generar</p>
                            </div>
                        </div>

                        <form onSubmit={submitOrder} className="space-y-4">
                            {step === 1 && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="provider-product-search"
                                                className="text-sm font-medium"
                                            >
                                                Buscar producto asignado
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="provider-product-search"
                                                    value={productSearch}
                                                    onChange={(event) =>
                                                        setProductSearch(event.target.value)
                                                    }
                                                    placeholder="Nombre, codigo o barras"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                        Productos seleccionados: {selectedProducts.length} | Total estimado: ${estimatedTotal.toFixed(2)}
                                    </div>

                                    <div className="grid gap-3">
                                        {filteredProviderProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className={`grid items-center gap-3 rounded-md border p-3 md:grid-cols-[auto_1fr_130px] ${
                                                    isProductSelected(product.product_id)
                                                        ? 'border-cyan-500/50 bg-cyan-500/5'
                                                        : 'border-slate-200/80 bg-background dark:border-slate-800'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isProductSelected(product.product_id)}
                                                    onChange={() => toggleProductSelection(product.product_id)}
                                                    className="size-4 rounded border"
                                                />

                                                <div>
                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">
                                                            {product.product_name} ({product.code})
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Barras: {product.barcode ?? 'Sin barras'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Precio final: ${product.special_price}
                                                    </p>
                                                    {Number(product.discount_percent) > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Descuento aplicado: {product.discount_percent}%
                                                        </p>
                                                    )}
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
                                                        disabled={!isProductSelected(product.product_id)}
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

                                        {filteredProviderProducts.length === 0 && (
                                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                                No hay productos que coincidan con la busqueda.
                                            </div>
                                        )}
                                    </div>

                                    {orderItemsError && (
                                        <p className="text-sm text-destructive">
                                            {orderItemsError}
                                        </p>
                                    )}

                                    <InputError message={orderForm.errors.items} />
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                        <p className="flex items-center gap-2 font-medium">
                                            <ListChecks className="size-4 text-cyan-600" />
                                            Resumen de seleccion: {selectedProducts.length} producto(s)
                                        </p>
                                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                                            {selectedProducts.slice(0, 6).map((product) => (
                                                <div
                                                    key={product.product_id}
                                                    className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs"
                                                >
                                                    {product.product_name} x {product.quantity}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="customer-email" className="text-sm font-medium">
                                            Correo del cliente
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
                                                className="pl-9"
                                            />
                                        </div>
                                        <InputError message={orderForm.errors.customer_email} />
                                    </div>

                                    <OrderSignaturePad
                                        value={orderForm.data.customer_signature}
                                        onChange={(signature) =>
                                            orderForm.setData('customer_signature', signature)
                                        }
                                        error={orderForm.errors.customer_signature}
                                    />

                                    {customerInfoError && (
                                        <p className="text-sm text-destructive">{customerInfoError}</p>
                                    )}
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <div className="rounded-md border bg-muted/20 p-3">
                                        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <CheckCircle2 className="size-4 text-emerald-600" />
                                            Verifica la informacion antes de generar el pedido
                                        </p>
                                        <div className="grid gap-3 text-sm md:grid-cols-2">
                                            <div className="rounded-md border bg-background px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Cliente</p>
                                                <p className="font-medium">{orderForm.data.customer_email}</p>
                                            </div>
                                            <div className="rounded-md border bg-background px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Total estimado</p>
                                                <p className="font-medium">${estimatedTotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-2">
                                        {selectedProducts.map((product) => (
                                            <div
                                                key={product.product_id}
                                                className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs"
                                            >
                                                {product.product_name} x {product.quantity}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Firma capturada</p>
                                        {orderForm.data.customer_signature ? (
                                            <img
                                                src={orderForm.data.customer_signature}
                                                alt="Firma del cliente"
                                                className="h-40 w-full rounded-md border object-contain"
                                            />
                                        ) : (
                                            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                                No hay firma registrada.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                                {step > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                                    >
                                        <ChevronLeft />
                                        Volver
                                    </Button>
                                )}

                                {step === 1 && (
                                    <Button type="button" onClick={goToStepTwo}>
                                        Siguiente
                                        <ChevronRight />
                                    </Button>
                                )}

                                {step === 2 && (
                                    <Button type="button" onClick={goToStepThree}>
                                        <UserRound />
                                        Revisar pedido
                                        <ChevronRight />
                                    </Button>
                                )}

                                {step === 3 && (
                                    <Button
                                        type="submit"
                                        disabled={
                                            orderForm.processing ||
                                            selectedProducts.length === 0 ||
                                            !orderForm.data.customer_signature ||
                                            orderForm.data.customer_email.trim().length === 0
                                        }
                                    >
                                        <TicketPercent />
                                        Generar pedido y enviar OTP
                                    </Button>
                                )}

                                <Button asChild type="button" variant="outline">
                                    <Link href={providerOrdersIndex()}>Volver a Pedidos</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ProviderCreateOrderPage.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pedidos',
            href: providerOrdersIndex(),
        },
        {
            title: 'Crear pedido',
            href: createProviderOrder(),
        },
    ],
};
