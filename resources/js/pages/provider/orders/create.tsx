import { Head, Link, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ListChecks,
    Mail,
    Minus,
    PackageSearch,
    Plus,
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
    customers: {
        id: number;
        name: string;
        email: string | null;
        nit: string | null;
        business_name: string | null;
        supermarket_name: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
    }[];
    products: {
        id: number;
        product_id: number;
        product_name: string | null;
        original_price: string;
        default_discount_percent: string;
        packaging_multiple: number;
    }[];
};

type SelectedItemState = {
    quantity: number;
};

type Props = {
    status?: string;
    providerWorkspace: ProviderWorkspace;
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value: number): string => {
    return currencyFormatter.format(value);
};

const normalizeDiscountPercent = (value: number): number => {
    if (Number.isNaN(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
};

const normalizePackageQuantity = (value: number): number => {
    if (Number.isNaN(value) || value <= 0) {
        return 0;
    }

    return Math.max(1, Math.round(value));
};

const calculateUnitSpecialPrice = (originalPrice: number, discountPercent: number): number => {
    const factor = (100 - normalizeDiscountPercent(discountPercent)) / 100;

    return Math.max(0, originalPrice * factor);
};

export default function ProviderCreateOrderPage({ status, providerWorkspace }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedItems, setSelectedItems] = useState<Record<number, SelectedItemState>>({});
    const [orderItemsError, setOrderItemsError] = useState<string | null>(null);
    const [customerInfoError, setCustomerInfoError] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');

    const orderForm = useForm<{
        customer_user_id: number | '';
        customer_email: string;
        customer_signature: string;
        items: {
            product_id: number;
            quantity: number;
        }[];
    }>({
        customer_user_id: '',
        customer_email: '',
        customer_signature: '',
        items: [],
    });

    const selectedCustomer = useMemo(() => {
        if (orderForm.data.customer_user_id === '') {
            return null;
        }

        return (
            providerWorkspace.customers.find(
                (customer) => customer.id === orderForm.data.customer_user_id,
            ) ?? null
        );
    }, [orderForm.data.customer_user_id, providerWorkspace.customers]);

    const selectedProducts = useMemo(() => {
        return providerWorkspace.products
            .map((product) => {
                const selectedState = selectedItems[product.product_id];
                const quantity = selectedState?.quantity ?? 0;
                const quantityInUnits = quantity * Math.max(1, product.packaging_multiple);
                const discountPercent = Number(product.default_discount_percent);
                const originalPrice = Number(product.original_price);
                const unitSpecialPrice = calculateUnitSpecialPrice(originalPrice, discountPercent);

                return {
                    ...product,
                    quantity,
                    quantity_in_units: quantityInUnits,
                    discount_percent: normalizeDiscountPercent(discountPercent),
                    unit_special_price: unitSpecialPrice,
                    line_special_total: unitSpecialPrice * quantityInUnits,
                    line_original_total: originalPrice * quantityInUnits,
                };
            })
            .filter((product) => product.quantity > 0);
    }, [providerWorkspace.products, selectedItems]);

    const estimatedOriginalTotal = selectedProducts.reduce((total, product) => {
        return total + product.line_original_total;
    }, 0);

    const estimatedSpecialTotal = selectedProducts.reduce((total, product) => {
        return total + product.line_special_total;
    }, 0);

    const estimatedDiscountTotal = estimatedOriginalTotal - estimatedSpecialTotal;

    const filteredProviderProducts = useMemo(() => {
        const term = productSearch.trim().toLowerCase();

        if (!term) {
            return providerWorkspace.products;
        }

        return providerWorkspace.products.filter((product) => {
            return (product.product_name ?? '').toLowerCase().includes(term);
        });
    }, [productSearch, providerWorkspace.products]);

    const isProductSelected = (productId: number): boolean => {
        return (selectedItems[productId]?.quantity ?? 0) > 0;
    };

    const toggleProductSelection = (productId: number) => {
        const product = providerWorkspace.products.find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        setSelectedItems((current) => {
            if ((current[productId]?.quantity ?? 0) > 0) {
                return {
                    ...current,
                    [productId]: {
                        quantity: 0,
                    },
                };
            }

            return {
                ...current,
                [productId]: {
                    quantity: 1,
                },
            };
        });
    };

    const handleQuantityChange = (productId: number, rawQuantity: number) => {
        const product = providerWorkspace.products.find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        const quantity = normalizePackageQuantity(rawQuantity);

        setSelectedItems((current) => ({
            ...current,
            [productId]: {
                quantity,
            },
        }));
    };

    const increaseQuantity = (productId: number) => {
        const product = providerWorkspace.products.find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        const currentQuantity = selectedItems[productId]?.quantity ?? 0;
        handleQuantityChange(productId, currentQuantity + 1);
    };

    const decreaseQuantity = (productId: number) => {
        const product = providerWorkspace.products.find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        const currentItem = selectedItems[productId];
        const currentQuantity = currentItem?.quantity ?? 0;
        const nextQuantity = currentQuantity - 1;

        setSelectedItems((current) => ({
            ...current,
            [productId]: {
                quantity: nextQuantity <= 0 ? 0 : nextQuantity,
            },
        }));
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
        if (orderForm.data.customer_user_id === '') {
            setCustomerInfoError('Debes seleccionar un cliente para continuar.');

            return;
        }

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
            quantity: product.quantity_in_units,
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
                orderForm.reset('customer_user_id', 'customer_email', 'customer_signature', 'items');
                setSelectedItems({});
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
                                                    placeholder="Nombre del producto"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm md:grid-cols-3">
                                        <p>Productos seleccionados: <span className="font-medium">{selectedProducts.length}</span></p>
                                        <p>Total estimado: <span className="font-medium">${formatCurrency(estimatedSpecialTotal)}</span></p>
                                        <p>Ahorro estimado: <span className="font-medium text-emerald-700 dark:text-emerald-300">${formatCurrency(estimatedDiscountTotal)}</span></p>
                                    </div>

                                    <div className="grid gap-3">
                                        {filteredProviderProducts.map((product) => {
                                            const selectedState = selectedItems[product.product_id];
                                            const normalizedDiscount = normalizeDiscountPercent(Number(product.default_discount_percent));
                                            const originalPrice = Number(product.original_price);
                                            const specialPrice = calculateUnitSpecialPrice(originalPrice, normalizedDiscount);
                                            const isSelected = isProductSelected(product.product_id);
                                            const safePackaging = Math.max(1, product.packaging_multiple);
                                            const packageQuantity = selectedState?.quantity ?? 0;
                                            const quantityInUnits = packageQuantity * safePackaging;

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`grid items-center gap-3 rounded-md border p-3 md:grid-cols-[auto_1fr_260px] ${
                                                        isSelected
                                                            ? 'border-cyan-500/50 bg-cyan-500/5'
                                                            : 'border-slate-200/80 bg-background dark:border-slate-800'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleProductSelection(product.product_id)}
                                                        className="size-4 rounded border"
                                                    />

                                                    <div className="space-y-1">
                                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                                            <p className="font-medium">{product.product_name}</p>
                                                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-700 dark:text-cyan-300">
                                                                Embalaje x{safePackaging}
                                                            </span>
                                                        </div>

                                                        <div className="text-xs">
                                                            {normalizedDiscount > 0 ? (
                                                                <p className="text-muted-foreground">
                                                                    <span className="line-through">${formatCurrency(originalPrice)}</span>
                                                                    <span className="ml-2 font-semibold text-foreground">${formatCurrency(specialPrice)}</span>
                                                                    <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                                                                        -{normalizedDiscount.toFixed(2)}%
                                                                    </span>
                                                                </p>
                                                            ) : (
                                                                <p className="font-semibold text-foreground">
                                                                    ${formatCurrency(originalPrice)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="rounded-md border bg-muted/20 px-2 py-1 text-xs">
                                                            <p className="text-muted-foreground">Descuento aplicado</p>
                                                            <p className="font-medium text-foreground">{normalizedDiscount.toFixed(2)}%</p>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label
                                                                htmlFor={`quantity-${product.product_id}`}
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
                                                                    disabled={!isSelected}
                                                                >
                                                                    <Minus className="size-4" />
                                                                </Button>
                                                                <Input
                                                                    id={`quantity-${product.product_id}`}
                                                                    type="number"
                                                                    min={0}
                                                                    step={1}
                                                                    value={selectedState?.quantity ?? 0}
                                                                    onChange={(event) =>
                                                                        handleQuantityChange(
                                                                            product.product_id,
                                                                            Number(event.target.value),
                                                                        )
                                                                    }
                                                                />
                                                                <span className="min-w-14 text-center text-xs text-muted-foreground">
                                                                    (x{quantityInUnits})
                                                                </span>
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
                                                    <p className="font-medium">{product.product_name}</p>
                                                    <p className="text-muted-foreground">
                                                        {product.quantity} (x{product.quantity_in_units}) • -{product.discount_percent.toFixed(2)}% • ${formatCurrency(product.line_special_total)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="customer-user" className="text-sm font-medium">
                                            Cliente registrado
                                        </label>
                                        <select
                                            id="customer-user"
                                            value={orderForm.data.customer_user_id}
                                            onChange={(event) => {
                                                const selectedCustomerId = event.target.value === ''
                                                    ? ''
                                                    : Number(event.target.value);

                                                orderForm.setData('customer_user_id', selectedCustomerId);

                                                if (selectedCustomerId === '') {
                                                    return;
                                                }

                                                const selected = providerWorkspace.customers.find(
                                                    (customer) => customer.id === selectedCustomerId,
                                                );

                                                if (
                                                    selected !== undefined &&
                                                    selected.email !== null &&
                                                    selected.email.trim() !== ''
                                                ) {
                                                    orderForm.setData('customer_email', selected.email);
                                                }
                                            }}
                                            className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        >
                                            <option value="">Selecciona un cliente</option>
                                            {providerWorkspace.customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.supermarket_name ?? customer.business_name ?? customer.name}
                                                    {customer.nit !== null ? ` - NIT ${customer.nit}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={orderForm.errors.customer_user_id} />
                                        {providerWorkspace.customers.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No hay clientes registrados. Pide al administrador crear clientes antes de generar pedidos.
                                            </p>
                                        )}
                                    </div>

                                    {selectedCustomer !== null && (
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                            <p>
                                                <span className="font-medium text-foreground">Razon social:</span>{' '}
                                                {selectedCustomer.business_name ?? 'No registrada'}
                                            </p>
                                            <p>
                                                <span className="font-medium text-foreground">Supermercado:</span>{' '}
                                                {selectedCustomer.supermarket_name ?? 'No registrado'}
                                            </p>
                                            <p>
                                                <span className="font-medium text-foreground">Ciudad/Departamento:</span>{' '}
                                                {selectedCustomer.city ?? 'Sin ciudad'} / {selectedCustomer.department ?? 'Sin departamento'}
                                            </p>
                                        </div>
                                    )}

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
                                        <div className="grid gap-3 text-sm md:grid-cols-3">
                                            <div className="rounded-md border bg-background px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Cliente seleccionado</p>
                                                <p className="font-medium">
                                                    {selectedCustomer?.supermarket_name
                                                        ?? selectedCustomer?.business_name
                                                        ?? selectedCustomer?.name
                                                        ?? 'Sin cliente seleccionado'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {orderForm.data.customer_email}
                                                </p>
                                            </div>
                                            <div className="rounded-md border bg-background px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Total estimado</p>
                                                <p className="font-medium">${formatCurrency(estimatedSpecialTotal)}</p>
                                            </div>
                                            <div className="rounded-md border bg-background px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Ahorro total</p>
                                                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                                                    ${formatCurrency(estimatedDiscountTotal)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-2">
                                        {selectedProducts.map((product) => (
                                            <div
                                                key={product.product_id}
                                                className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs"
                                            >
                                                <p className="font-medium">{product.product_name}</p>
                                                <p className="text-muted-foreground">
                                                    {product.quantity} (x{product.quantity_in_units}) • -{product.discount_percent.toFixed(2)}%
                                                </p>
                                                <p className="font-medium">
                                                    ${formatCurrency(product.line_special_total)}
                                                </p>
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
                                            orderForm.data.customer_user_id === '' ||
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
