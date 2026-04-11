import { Head, useForm } from '@inertiajs/react';
import {
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Eye,
    Handshake,
    Link2,
    PackageSearch,
    PencilLine,
    Search,
    Tag,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCopCurrency } from '@/lib/utils';
import { destroy, index, store, update } from '@/routes/admin/provider-products';

type Assignment = {
    id: number;
    provider_id: number;
    provider_name: string | null;
    product_id: number;
    product_name: string | null;
    product_code: string | null;
    product_barcode: string | null;
    product_original_price: string | null;
    discount_percent: string;
    special_price: string;
    is_active: boolean;
};

type ProviderOption = {
    id: number;
    company_name: string;
};

type ProductOption = {
    id: number;
    name: string;
    code: string;
    barcode: string;
    original_price: string;
};

type ProductDiscountInput = {
    product_id: number;
    discount_value: string;
};

type Props = {
    assignments: Assignment[];
    providers: ProviderOption[];
    products: ProductOption[];
    available_product_ids_by_provider: Record<string, number[]>;
    status?: string;
};

const parseDecimal = (value: string): number | null => {
    const parsedValue = Number.parseFloat(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const resolveSpecialPriceValue = (originalPrice: string, discountPercent: string): string => {
    const originalPriceNumber = parseDecimal(originalPrice);
    const discountPercentNumber = parseDecimal(discountPercent);

    if (
        originalPriceNumber === null ||
        originalPriceNumber <= 0 ||
        discountPercentNumber === null
    ) {
        return '';
    }

    return (originalPriceNumber * ((100 - discountPercentNumber) / 100)).toFixed(2);
};

const resolveDiscountPercentValue = (originalPrice: string, specialPrice: string): string => {
    const originalPriceNumber = parseDecimal(originalPrice);
    const specialPriceNumber = parseDecimal(specialPrice);

    if (
        originalPriceNumber === null ||
        originalPriceNumber <= 0 ||
        specialPriceNumber === null
    ) {
        return '';
    }

    return (((originalPriceNumber - specialPriceNumber) / originalPriceNumber) * 100).toFixed(2);
};

const formatCurrencyLabel = (value: string): string => {
    return formatCopCurrency(value);
};

function EditableAssignmentCard({
    assignment,
    providers,
    products,
}: {
    assignment: Assignment;
    providers: ProviderOption[];
    products: ProductOption[];
}) {
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [pricingMode, setPricingMode] = useState<'percent' | 'special'>('percent');

    const form = useForm<{
        provider_id: number;
        product_id: number;
        original_price: string;
        discount_value: string;
        special_price: string;
        is_active: boolean;
    }>({
        provider_id: assignment.provider_id,
        product_id: assignment.product_id,
        original_price: assignment.product_original_price ?? '',
        discount_value: assignment.discount_percent,
        special_price: assignment.special_price,
        is_active: assignment.is_active,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.transform((data) => ({
            provider_id: data.provider_id,
            product_id: data.product_id,
            original_price: data.original_price,
            is_active: data.is_active,
            ...(pricingMode === 'percent'
                ? { discount_value: data.discount_value }
                : { special_price: data.special_price }),
        }));

        form.patch(update.url({ providerProduct: assignment.id }), {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara la asignacion de ${assignment.product_name}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ providerProduct: assignment.id }), {
            preserveScroll: true,
        });
    };

    const toggleView = () => {
        setIsViewing((previous) => !previous);
    };

    const toggleEdit = () => {
        setIsEditing((previous) => !previous);
        setIsViewing(true);
    };

    const handleProductSelection = (productId: number) => {
        form.setData('product_id', productId);

        const selectedProduct = products.find((product) => product.id === productId);

        if (selectedProduct !== undefined) {
            form.setData('original_price', selectedProduct.original_price);

            if (pricingMode === 'percent') {
                form.setData(
                    'special_price',
                    resolveSpecialPriceValue(
                        selectedProduct.original_price,
                        form.data.discount_value,
                    ),
                );
            } else {
                form.setData(
                    'discount_value',
                    resolveDiscountPercentValue(
                        selectedProduct.original_price,
                        form.data.special_price,
                    ),
                );
            }
        }
    };

    const handleOriginalPriceChange = (originalPrice: string) => {
        form.setData('original_price', originalPrice);

        if (pricingMode === 'percent') {
            form.setData(
                'special_price',
                resolveSpecialPriceValue(originalPrice, form.data.discount_value),
            );

            return;
        }

        form.setData(
            'discount_value',
            resolveDiscountPercentValue(originalPrice, form.data.special_price),
        );
    };

    const handleDiscountPercentChange = (discountPercent: string) => {
        form.setData('discount_value', discountPercent);
        form.setData(
            'special_price',
            resolveSpecialPriceValue(form.data.original_price, discountPercent),
        );
    };

    const handleSpecialPriceChange = (specialPrice: string) => {
        form.setData('special_price', specialPrice);
        form.setData(
            'discount_value',
            resolveDiscountPercentValue(form.data.original_price, specialPrice),
        );
    };

    return (
        <Card className="overflow-hidden border-amber-500/20 shadow-sm">
            <CardHeader className="gap-4 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-teal-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>
                            {assignment.product_name}
                        </CardTitle>
                        <CardDescription>{assignment.provider_name}</CardDescription>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-muted-foreground line-through">
                                {formatCurrencyLabel(assignment.product_original_price ?? '0.00')}
                            </span>
                            <span className="text-base font-semibold text-amber-600 dark:text-amber-400">
                                {formatCurrencyLabel(assignment.special_price)}
                            </span>
                        </div>
                    </div>
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
                    >
                        <PencilLine />
                        Editar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={form.processing}
                    >
                        <Trash2 />
                        Eliminar
                    </Button>
                </div>
            </CardHeader>

            {isViewing && (
                <CardContent className="border-t border-amber-500/15 bg-background/80">
                    <div className="grid gap-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Precio original
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {formatCurrencyLabel(assignment.product_original_price ?? '0.00')}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Descuento (%)
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {assignment.discount_percent}%
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Estado
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {assignment.is_active ? 'Activa' : 'Inactiva'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="border-t border-dashed border-amber-500/30 bg-amber-500/3">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor={`assignment-provider-${assignment.id}`}
                                    className="text-sm font-medium"
                                >
                                    Proveedor
                                </label>
                                <select
                                    id={`assignment-provider-${assignment.id}`}
                                    value={form.data.provider_id}
                                    onChange={(event) =>
                                        form.setData(
                                            'provider_id',
                                            Number(event.target.value),
                                        )
                                    }
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                >
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>
                                            {provider.company_name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.provider_id} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`assignment-product-${assignment.id}`}
                                    className="text-sm font-medium"
                                >
                                    Producto
                                </label>
                                <select
                                    id={`assignment-product-${assignment.id}`}
                                    value={form.data.product_id}
                                    onChange={(event) => {
                                        handleProductSelection(Number(event.target.value));
                                    }}
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                >
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.code})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.product_id} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor={`assignment-original-price-${assignment.id}`}
                                    className="text-sm font-medium"
                                >
                                    Precio original
                                </label>
                                <Input
                                    id={`assignment-original-price-${assignment.id}`}
                                    value={form.data.original_price}
                                    onChange={(event) =>
                                        handleOriginalPriceChange(event.target.value)
                                    }
                                    inputMode="decimal"
                                />
                                <InputError message={form.errors.original_price} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`assignment-pricing-mode-${assignment.id}`}
                                    className="text-sm font-medium"
                                >
                                    Modo de calculo
                                </label>
                                <select
                                    id={`assignment-pricing-mode-${assignment.id}`}
                                    value={pricingMode}
                                    onChange={(event) =>
                                        setPricingMode(event.target.value as 'percent' | 'special')
                                    }
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                >
                                    <option value="percent">Porcentaje (%)</option>
                                    <option value="special">Precio especial</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {pricingMode === 'percent' ? (
                                <div className="space-y-2">
                                    <label
                                        htmlFor={`assignment-discount-value-${assignment.id}`}
                                        className="text-sm font-medium"
                                    >
                                        Descuento (%)
                                    </label>
                                    <Input
                                        id={`assignment-discount-value-${assignment.id}`}
                                        value={form.data.discount_value}
                                        onChange={(event) =>
                                            handleDiscountPercentChange(event.target.value)
                                        }
                                        inputMode="decimal"
                                    />
                                    <InputError message={form.errors.discount_value} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label
                                        htmlFor={`assignment-special-price-${assignment.id}`}
                                        className="text-sm font-medium"
                                    >
                                        Precio especial
                                    </label>
                                    <Input
                                        id={`assignment-special-price-${assignment.id}`}
                                        value={form.data.special_price}
                                        onChange={(event) =>
                                            handleSpecialPriceChange(event.target.value)
                                        }
                                        inputMode="decimal"
                                    />
                                    <InputError message={form.errors.special_price} />
                                </div>
                            )}

                            <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                <p className="text-xs text-muted-foreground">Descuento resultante</p>
                                <p className="font-medium">{form.data.discount_value || '0.00'}%</p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                            <p className="text-xs text-muted-foreground">Precio especial estimado</p>
                            <p className="font-medium">{formatCurrencyLabel(form.data.special_price || '0.00')}</p>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) =>
                                    form.setData('is_active', event.target.checked)
                                }
                                className="size-4 rounded border"
                            />
                            Asignacion activa
                        </label>
                        <InputError message={form.errors.is_active} />

                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="submit" disabled={form.processing}>
                                Guardar cambios
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancelar edicion
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}
        </Card>
    );
}

export default function ProviderProductsIndex({
    assignments,
    providers,
    products,
    available_product_ids_by_provider: availableProductIdsByProvider,
    status,
}: Props) {
    const [search, setSearch] = useState('');
    const [createPricingMode, setCreatePricingMode] = useState<'percent' | 'special'>('percent');
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [providerSearchTerm, setProviderSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [createFlowError, setCreateFlowError] = useState<string | null>(null);

    const createForm = useForm<{
        provider_id: number | '';
        product_ids: number[];
        original_price: string;
        discount_value: string;
        special_price: string;
        product_discounts: ProductDiscountInput[];
        is_active: boolean;
    }>({
        provider_id: providers[0]?.id ?? '',
        product_ids: [],
        original_price: '',
        discount_value: '0',
        special_price: '',
        product_discounts: [],
        is_active: true,
    });

    const selectedProvider = useMemo(() => {
        return providers.find((provider) => provider.id === createForm.data.provider_id) ?? null;
    }, [createForm.data.provider_id, providers]);

    const selectedProducts = useMemo(() => {
        return products.filter((product) => createForm.data.product_ids.includes(product.id));
    }, [createForm.data.product_ids, products]);

    const selectedProduct = useMemo(() => {
        if (selectedProducts.length !== 1) {
            return null;
        }

        return selectedProducts[0];
    }, [selectedProducts]);

    const isBulkCreateMode = selectedProducts.length > 1;

    const filteredProvidersForCreate = useMemo(() => {
        const term = providerSearchTerm.trim().toLowerCase();

        if (!term) {
            return providers;
        }

        return providers.filter((provider) => {
            return provider.company_name.toLowerCase().includes(term);
        });
    }, [providerSearchTerm, providers]);

    const availableProductsForCreate = useMemo(() => {
        if (createForm.data.provider_id === '') {
            return [];
        }

        const availableProductIds =
            availableProductIdsByProvider[String(createForm.data.provider_id)] ??
            products.map((product) => product.id);
        const availableProductIdsSet = new Set(availableProductIds);

        return products.filter((product) => availableProductIdsSet.has(product.id));
    }, [availableProductIdsByProvider, createForm.data.provider_id, products]);

    const filteredProductsForCreate = useMemo(() => {
        const term = productSearchTerm.trim().toLowerCase();

        if (!term) {
            return availableProductsForCreate;
        }

        return availableProductsForCreate.filter((product) => {
            return (
                product.name.toLowerCase().includes(term) ||
                product.code.toLowerCase().includes(term) ||
                product.barcode.toLowerCase().includes(term)
            );
        });
    }, [availableProductsForCreate, productSearchTerm]);

    const selectProviderForCreate = (providerId: number) => {
        createForm.setData('provider_id', providerId);

        const nextAvailableProductIds =
            availableProductIdsByProvider[String(providerId)] ?? products.map((product) => product.id);
        const nextAvailableProductIdsSet = new Set(nextAvailableProductIds);
        const nextProductIds = createForm.data.product_ids.filter((productId) =>
            nextAvailableProductIdsSet.has(productId),
        );

        if (nextProductIds.length !== createForm.data.product_ids.length) {
            createForm.setData('product_ids', nextProductIds);
            syncCreateProductDiscounts(nextProductIds);

            if (nextProductIds.length !== 1) {
                createForm.setData('original_price', '');
            }

            if (nextProductIds.length === 0) {
                createForm.setData('special_price', '');
            }
        }
    };

    const resolvePricingPreviewOriginal = (): string => {
        if (selectedProduct !== null) {
            return selectedProduct.original_price;
        }

        if (selectedProducts.length > 0) {
            return selectedProducts[0].original_price;
        }

        return createForm.data.original_price;
    };

    const syncCreateProductDiscounts = (nextProductIds: number[]) => {
        const previousDiscountsByProductId = new Map(
            createForm.data.product_discounts.map((discount) => [
                discount.product_id,
                discount.discount_value,
            ]),
        );

        createForm.setData(
            'product_discounts',
            nextProductIds.map((productId) => ({
                product_id: productId,
                discount_value:
                    previousDiscountsByProductId.get(productId) ?? createForm.data.discount_value,
            })),
        );
    };

    const resolveCreateProductDiscountValue = (productId: number): string => {
        const productDiscount = createForm.data.product_discounts.find(
            (discount) => discount.product_id === productId,
        );

        return productDiscount?.discount_value ?? createForm.data.discount_value;
    };

    const handleCreateProductDiscountChange = (productId: number, discountValue: string) => {
        const hasExistingDiscount = createForm.data.product_discounts.some(
            (discount) => discount.product_id === productId,
        );

        if (!hasExistingDiscount) {
            createForm.setData('product_discounts', [
                ...createForm.data.product_discounts,
                {
                    product_id: productId,
                    discount_value: discountValue,
                },
            ]);

            return;
        }

        createForm.setData(
            'product_discounts',
            createForm.data.product_discounts.map((discount) => {
                if (discount.product_id !== productId) {
                    return discount;
                }

                return {
                    ...discount,
                    discount_value: discountValue,
                };
            }),
        );
    };

    const toggleProductForCreate = (productId: number) => {
        const isSelected = createForm.data.product_ids.includes(productId);
        const nextProductIds = isSelected
            ? createForm.data.product_ids.filter((id) => id !== productId)
            : [...createForm.data.product_ids, productId];

        createForm.setData('product_ids', nextProductIds);
        syncCreateProductDiscounts(nextProductIds);

        if (nextProductIds.length === 1) {
            const nextProduct = products.find((product) => product.id === nextProductIds[0]);

            if (nextProduct !== undefined) {
                createForm.setData('original_price', nextProduct.original_price);

                if (createPricingMode === 'percent') {
                    createForm.setData(
                        'special_price',
                        resolveSpecialPriceValue(
                            nextProduct.original_price,
                            createForm.data.discount_value,
                        ),
                    );
                } else {
                    createForm.setData(
                        'discount_value',
                        resolveDiscountPercentValue(
                            nextProduct.original_price,
                            createForm.data.special_price,
                        ),
                    );
                }
            }
        }

        if (nextProductIds.length !== 1) {
            createForm.setData('original_price', '');
        }

        if (nextProductIds.length > 1 && createPricingMode === 'special') {
            setCreatePricingMode('percent');
            createForm.setData('special_price', '');
        }
    };

    const selectFilteredProductsForCreate = () => {
        const mergedProductIds = Array.from(
            new Set([
                ...createForm.data.product_ids,
                ...filteredProductsForCreate.map((product) => product.id),
            ]),
        );

        createForm.setData('product_ids', mergedProductIds);
    syncCreateProductDiscounts(mergedProductIds);

        if (mergedProductIds.length === 1) {
            const selectedOnlyProduct = products.find((product) => product.id === mergedProductIds[0]);

            if (selectedOnlyProduct !== undefined) {
                createForm.setData('original_price', selectedOnlyProduct.original_price);

                if (createPricingMode === 'percent') {
                    createForm.setData(
                        'special_price',
                        resolveSpecialPriceValue(
                            selectedOnlyProduct.original_price,
                            createForm.data.discount_value,
                        ),
                    );
                } else {
                    createForm.setData(
                        'discount_value',
                        resolveDiscountPercentValue(
                            selectedOnlyProduct.original_price,
                            createForm.data.special_price,
                        ),
                    );
                }
            }
        }

        if (mergedProductIds.length > 1 && createPricingMode === 'special') {
            setCreatePricingMode('percent');
            createForm.setData('special_price', '');
        }
    };

    const clearSelectedProductsForCreate = () => {
        createForm.setData('product_ids', []);
        createForm.setData('original_price', '');
        createForm.setData('special_price', '');
        createForm.setData('product_discounts', []);
        setCreateFlowError(null);
    };

    const handleCreatePricingModeChange = (mode: 'percent' | 'special') => {
        if (mode === 'special' && isBulkCreateMode) {
            setCreateFlowError('Para varios productos usa descuento en porcentaje.');

            return;
        }

        setCreateFlowError(null);
        setCreatePricingMode(mode);
        const pricingPreviewOriginal = resolvePricingPreviewOriginal();

        if (mode === 'percent') {
            createForm.setData(
                'special_price',
                resolveSpecialPriceValue(pricingPreviewOriginal, createForm.data.discount_value),
            );

            return;
        }

        createForm.setData(
            'discount_value',
            resolveDiscountPercentValue(pricingPreviewOriginal, createForm.data.special_price),
        );
    };

    const moveCreateToPricingStep = () => {
        if (createForm.data.provider_id === '' || selectedProducts.length === 0) {
            setCreateFlowError('Selecciona un proveedor y al menos un producto para continuar.');

            return;
        }

        if (selectedProduct !== null) {
            createForm.setData('original_price', selectedProduct.original_price);

            if (createPricingMode === 'percent') {
                createForm.setData(
                    'special_price',
                    resolveSpecialPriceValue(
                        selectedProduct.original_price,
                        createForm.data.discount_value,
                    ),
                );
            } else {
                createForm.setData(
                    'discount_value',
                    resolveDiscountPercentValue(
                        selectedProduct.original_price,
                        createForm.data.special_price,
                    ),
                );
            }
        }

        if (selectedProducts.length > 1) {
            syncCreateProductDiscounts(selectedProducts.map((product) => product.id));
        }

        if (selectedProducts.length > 1 && createPricingMode === 'special') {
            setCreatePricingMode('percent');
            createForm.setData('special_price', '');
        }

        setCreateFlowError(null);
        setCreateStep(2);
    };

    const moveCreateToReviewStep = () => {
        if (selectedProducts.length === 0) {
            setCreateFlowError('Selecciona al menos un producto.');

            return;
        }

        if (!isBulkCreateMode) {
            const originalPrice = parseDecimal(createForm.data.original_price);

            if (originalPrice === null || originalPrice <= 0) {
                setCreateFlowError('Ingresa un precio original valido mayor a 0.');

                return;
            }
        }

        if (createPricingMode === 'percent') {
            if (isBulkCreateMode) {
                const invalidProduct = selectedProducts.find((product) => {
                    const productDiscountPercent = parseDecimal(
                        resolveCreateProductDiscountValue(product.id),
                    );

                    return (
                        productDiscountPercent === null ||
                        productDiscountPercent < 0 ||
                        productDiscountPercent > 100
                    );
                });

                if (invalidProduct !== undefined) {
                    setCreateFlowError(
                        `Ingresa un descuento % valido entre 0 y 100 para ${invalidProduct.name}.`,
                    );

                    return;
                }
            } else {
                const discountPercent = parseDecimal(createForm.data.discount_value);

                if (discountPercent === null || discountPercent < 0 || discountPercent > 100) {
                    setCreateFlowError('Ingresa un descuento % valido entre 0 y 100.');

                    return;
                }
            }
        } else {
            const specialPrice = parseDecimal(createForm.data.special_price);

            if (specialPrice === null || specialPrice < 0) {
                setCreateFlowError('Ingresa un precio especial valido.');

                return;
            }

            const hasInvalidSpecialPrice = selectedProducts.some((product) => {
                const productOriginalPrice = parseDecimal(product.original_price);

                if (productOriginalPrice === null) {
                    return true;
                }

                return specialPrice > productOriginalPrice;
            });

            if (hasInvalidSpecialPrice) {
                setCreateFlowError('El precio especial no puede superar el precio original de un producto seleccionado.');

                return;
            }
        }

        setCreateFlowError(null);
        setCreateStep(3);
    };

    const moveCreateBack = () => {
        setCreateFlowError(null);
        setCreateStep((previousStep) => {
            if (previousStep === 3) {
                return 2;
            }

            return 1;
        });
    };

    const resetCreateWizard = () => {
        createForm.reset();
        createForm.setData('provider_id', providers[0]?.id ?? '');
        createForm.setData('product_ids', []);
        createForm.setData('original_price', '');
        createForm.setData('discount_value', '0');
        createForm.setData('special_price', '');
        createForm.setData('product_discounts', []);
        createForm.setData('is_active', true);
        setCreatePricingMode('percent');
        setCreateStep(1);
        setProviderSearchTerm('');
        setProductSearchTerm('');
        setCreateFlowError(null);
    };

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (createStep !== 3) {
            return;
        }

        if (createForm.data.product_ids.length === 0) {
            setCreateFlowError('Selecciona al menos un producto para crear la asignacion.');

            return;
        }

        const isSingleSelection = createForm.data.product_ids.length === 1;

        createForm.transform((data) => ({
            provider_id: Number(data.provider_id),
            product_ids: data.product_ids,
            is_active: data.is_active,
            ...(!isSingleSelection
                ? {
                      product_discounts: data.product_discounts.filter((discount) =>
                          data.product_ids.includes(discount.product_id),
                      ),
                  }
                : {}),
            ...(isSingleSelection ? { original_price: data.original_price } : {}),
            ...(!isSingleSelection || createPricingMode === 'percent'
                ? { discount_value: data.discount_value }
                : { special_price: data.special_price }),
        }));

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                resetCreateWizard();
            },
        });
    };

    const handleCreateOriginalPriceChange = (originalPrice: string) => {
        createForm.setData('original_price', originalPrice);

        if (createPricingMode === 'percent') {
            createForm.setData(
                'special_price',
                resolveSpecialPriceValue(originalPrice, createForm.data.discount_value),
            );

            return;
        }

        createForm.setData(
            'discount_value',
            resolveDiscountPercentValue(originalPrice, createForm.data.special_price),
        );
    };

    const handleCreateDiscountPercentChange = (discountPercent: string) => {
        createForm.setData('discount_value', discountPercent);
        const pricingPreviewOriginal = resolvePricingPreviewOriginal();

        createForm.setData(
            'special_price',
            resolveSpecialPriceValue(pricingPreviewOriginal, discountPercent),
        );
    };

    const handleCreateSpecialPriceChange = (specialPrice: string) => {
        createForm.setData('special_price', specialPrice);
        const pricingPreviewOriginal = resolvePricingPreviewOriginal();

        createForm.setData(
            'discount_value',
            resolveDiscountPercentValue(pricingPreviewOriginal, specialPrice),
        );
    };

    const filteredAssignments = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return assignments;
        }

        return assignments.filter((assignment) => {
            return (
                (assignment.provider_name ?? '').toLowerCase().includes(term) ||
                (assignment.product_name ?? '').toLowerCase().includes(term) ||
                (assignment.product_code ?? '').toLowerCase().includes(term) ||
                (assignment.product_barcode ?? '').toLowerCase().includes(term)
            );
        });
    }, [assignments, search]);

    return (
        <>
            <Head title="Asignaciones proveedor-producto" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Asignaciones proveedor-producto"
                    description="Gestiona relaciones y descuentos con acciones directas"
                />

                <Card className="border-amber-500/25 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-teal-500/10">
                    <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Asignaciones activas
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Link2 className="size-5 text-amber-600" />
                                {assignments.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Proveedores disponibles
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Handshake className="size-5 text-orange-600" />
                                {providers.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Productos disponibles
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Tag className="size-5 text-teal-600" />
                                {products.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BadgeCheck className="size-4 text-amber-600" />
                            Crear asignacion
                        </CardTitle>
                        <CardDescription>
                            Flujo guiado para crear asignaciones de forma rapida y sin errores.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        createStep === 1
                                            ? 'border-amber-500/50 bg-amber-500/10'
                                            : 'bg-muted/20'
                                    }`}
                                >
                                    <p className="font-medium">Paso 1</p>
                                    <p className="text-xs text-muted-foreground">
                                        Seleccionar proveedor y productos
                                    </p>
                                </div>
                                <div
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        createStep === 2
                                            ? 'border-amber-500/50 bg-amber-500/10'
                                            : 'bg-muted/20'
                                    }`}
                                >
                                    <p className="font-medium">Paso 2</p>
                                    <p className="text-xs text-muted-foreground">
                                        Configurar precio y descuento
                                    </p>
                                </div>
                                <div
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        createStep === 3
                                            ? 'border-amber-500/50 bg-amber-500/10'
                                            : 'bg-muted/20'
                                    }`}
                                >
                                    <p className="font-medium">Paso 3</p>
                                    <p className="text-xs text-muted-foreground">
                                        Revisar y confirmar
                                    </p>
                                </div>
                            </div>

                            {createStep === 1 && (
                                <div className="space-y-4">
                                    <div className="grid items-start gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="provider-create-search"
                                                className="text-sm font-medium"
                                            >
                                                Buscar proveedor
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="provider-create-search"
                                                    value={providerSearchTerm}
                                                    onChange={(event) =>
                                                        setProviderSearchTerm(event.target.value)
                                                    }
                                                    placeholder="Empresa"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="product-create-search"
                                                className="text-sm font-medium"
                                            >
                                                Buscar producto
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="product-create-search"
                                                    value={productSearchTerm}
                                                    onChange={(event) =>
                                                        setProductSearchTerm(event.target.value)
                                                    }
                                                    placeholder="Nombre"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="self-start space-y-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                                            <p className="flex items-center gap-2 text-sm font-medium">
                                                <Handshake className="size-4 text-amber-600" />
                                                Elige proveedor
                                            </p>
                                            <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                                {filteredProvidersForCreate.map((provider) => {
                                                    const isSelected = createForm.data.provider_id === provider.id;

                                                    return (
                                                        <button
                                                            key={provider.id}
                                                            type="button"
                                                            onClick={() => selectProviderForCreate(provider.id)}
                                                            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                                                isSelected
                                                                    ? 'border-amber-500/50 bg-amber-500/10'
                                                                    : 'border-slate-200/70 hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-slate-800'
                                                            }`}
                                                        >
                                                            <p className="font-medium text-foreground">
                                                                {provider.company_name}
                                                            </p>
                                                        </button>
                                                    );
                                                })}

                                                {filteredProvidersForCreate.length === 0 && (
                                                    <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                                                        No hay proveedores para este filtro.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="self-start space-y-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                                            <p className="flex items-center gap-2 text-sm font-medium">
                                                <PackageSearch className="size-4 text-teal-600" />
                                                Elige productos
                                            </p>
                                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs">
                                                <p className="text-muted-foreground">
                                                    Seleccionados: {createForm.data.product_ids.length}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={selectFilteredProductsForCreate}
                                                        disabled={filteredProductsForCreate.length === 0}
                                                    >
                                                        Seleccionar filtrados
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={clearSelectedProductsForCreate}
                                                        disabled={createForm.data.product_ids.length === 0}
                                                    >
                                                        Limpiar
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                                {filteredProductsForCreate.map((product) => {
                                                    const isSelected = createForm.data.product_ids.includes(product.id);

                                                    return (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            onClick={() => toggleProductForCreate(product.id)}
                                                            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                                                isSelected
                                                                    ? 'border-teal-500/50 bg-teal-500/10'
                                                                    : 'border-slate-200/70 hover:border-teal-500/40 hover:bg-teal-500/5 dark:border-slate-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="font-medium text-foreground">
                                                                        {product.name}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Precio base: {formatCurrencyLabel(product.original_price)}
                                                                    </p>
                                                                </div>
                                                                {isSelected && (
                                                                    <CircleCheck className="size-4 text-teal-600" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}

                                                {filteredProductsForCreate.length === 0 && (
                                                    <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                                                        {availableProductsForCreate.length === 0
                                                            ? 'Todos los productos ya estan asignados para este proveedor.'
                                                            : 'No hay productos para este filtro.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 rounded-md border bg-muted/20 px-3 py-3 text-sm md:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Proveedor seleccionado</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProvider?.company_name ?? 'Ninguno'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Productos seleccionados</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProducts.length === 0
                                                    ? 'Ninguno'
                                                    : selectedProducts.length === 1
                                                      ? selectedProducts[0].name
                                                      : `${selectedProducts.length} productos`}
                                            </p>
                                        </div>
                                    </div>

                                    <InputError message={createForm.errors.provider_id} />
                                    <InputError message={createForm.errors.product_ids} />
                                </div>
                            )}

                            {createStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid gap-3 rounded-md border bg-muted/20 px-3 py-3 text-sm md:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Proveedor</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProvider?.company_name ?? 'No seleccionado'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Productos</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProducts.length === 0
                                                    ? 'No seleccionados'
                                                    : selectedProducts.length === 1
                                                      ? selectedProducts[0].name
                                                      : `${selectedProducts.length} productos seleccionados`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {selectedProduct !== null ? (
                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="new-assignment-original-price"
                                                    className="text-sm font-medium"
                                                >
                                                    Precio original
                                                </label>
                                                <Input
                                                    id="new-assignment-original-price"
                                                    value={createForm.data.original_price}
                                                    onChange={(event) =>
                                                        handleCreateOriginalPriceChange(event.target.value)
                                                    }
                                                    inputMode="decimal"
                                                />
                                                <InputError message={createForm.errors.original_price} />
                                            </div>
                                        ) : (
                                            <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                                <p className="text-xs text-muted-foreground">Precio original</p>
                                                <p className="font-medium text-foreground">
                                                    Se usa el precio original de cada producto seleccionado.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="new-assignment-pricing-mode"
                                                className="text-sm font-medium"
                                            >
                                                Modo de calculo
                                            </label>
                                            <select
                                                id="new-assignment-pricing-mode"
                                                value={createPricingMode}
                                                onChange={(event) =>
                                                    handleCreatePricingModeChange(
                                                        event.target.value as 'percent' | 'special',
                                                    )
                                                }
                                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            >
                                                <option value="percent">Porcentaje (%)</option>
                                                <option value="special" disabled={isBulkCreateMode}>
                                                    Precio especial
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    {isBulkCreateMode ? (
                                        <div className="space-y-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                                            <p className="text-sm font-medium text-foreground">
                                                Configura descuento individual por producto
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Define un porcentaje para cada producto seleccionado.
                                            </p>
                                            <div className="max-h-72 space-y-2 overflow-auto pr-1">
                                                {selectedProducts.map((product) => {
                                                    const productDiscountValue =
                                                        resolveCreateProductDiscountValue(product.id);

                                                    return (
                                                        <div
                                                            key={product.id}
                                                            className="grid gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs md:grid-cols-[2fr_1fr_1.2fr_1.2fr]"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-foreground">
                                                                    {product.name}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Precio original</p>
                                                                <p className="text-foreground">
                                                                    {formatCurrencyLabel(product.original_price)}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label
                                                                    htmlFor={`new-assignment-discount-value-${product.id}`}
                                                                    className="text-muted-foreground"
                                                                >
                                                                    Descuento (%)
                                                                </label>
                                                                <Input
                                                                    id={`new-assignment-discount-value-${product.id}`}
                                                                    value={productDiscountValue}
                                                                    onChange={(event) =>
                                                                        handleCreateProductDiscountChange(
                                                                            product.id,
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    inputMode="decimal"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Especial estimado</p>
                                                                <p className="text-foreground">
                                                                    {formatCurrencyLabel(
                                                                        resolveSpecialPriceValue(
                                                                            product.original_price,
                                                                            productDiscountValue,
                                                                        ),
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <InputError message={createForm.errors.product_discounts} />
                                            <InputError message={createForm.errors.discount_value} />
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {createPricingMode === 'percent' ? (
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="new-assignment-discount-value"
                                                        className="text-sm font-medium"
                                                    >
                                                        Descuento (%)
                                                    </label>
                                                    <Input
                                                        id="new-assignment-discount-value"
                                                        value={createForm.data.discount_value}
                                                        onChange={(event) =>
                                                            handleCreateDiscountPercentChange(
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                    />
                                                    <InputError message={createForm.errors.discount_value} />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="new-assignment-special-price"
                                                        className="text-sm font-medium"
                                                    >
                                                        Precio especial
                                                    </label>
                                                    <Input
                                                        id="new-assignment-special-price"
                                                        value={createForm.data.special_price}
                                                        onChange={(event) =>
                                                            handleCreateSpecialPriceChange(
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                    />
                                                    <InputError message={createForm.errors.special_price} />
                                                </div>
                                            )}

                                            <div className="space-y-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Descuento resultante</p>
                                                    <p className="font-medium">{createForm.data.discount_value || '0.00'}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Precio especial estimado</p>
                                                    <p className="font-medium">
                                                        {createPricingMode === 'percent'
                                                            ? formatCurrencyLabel(createForm.data.special_price)
                                                            : createForm.data.special_price
                                                              ? formatCurrencyLabel(createForm.data.special_price)
                                                              : 'Se calcula por producto'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 text-sm font-medium">
                                        <input
                                            type="checkbox"
                                            checked={createForm.data.is_active}
                                            onChange={(event) =>
                                                createForm.setData(
                                                    'is_active',
                                                    event.target.checked,
                                                )
                                            }
                                            className="size-4 rounded border"
                                        />
                                        Asignacion activa
                                    </label>
                                </div>
                            )}

                            {createStep === 3 && (
                                <div className="space-y-4">
                                    <div className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                                        Revisa estos datos antes de crear la asignacion.
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                            <p className="text-xs text-muted-foreground">Proveedor</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProvider?.company_name ?? 'No seleccionado'}
                                            </p>
                                        </div>
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                            <p className="text-xs text-muted-foreground">Productos</p>
                                            <p className="font-medium text-foreground">
                                                {selectedProducts.length === 0
                                                    ? 'No seleccionados'
                                                    : selectedProducts.length === 1
                                                      ? selectedProducts[0].name
                                                      : `${selectedProducts.length} productos seleccionados`}
                                            </p>
                                        </div>
                                        {selectedProduct !== null && (
                                            <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                                <p className="text-xs text-muted-foreground">Precio original</p>
                                                <p className="font-medium text-foreground">
                                                    {formatCurrencyLabel(createForm.data.original_price)}
                                                </p>
                                            </div>
                                        )}
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                            <p className="text-xs text-muted-foreground">Modo de calculo</p>
                                            <p className="font-medium text-foreground">
                                                {createPricingMode === 'percent' ? 'Porcentaje (%)' : 'Precio especial'}
                                            </p>
                                        </div>
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                            <p className="text-xs text-muted-foreground">Descuento final</p>
                                            <p className="font-medium text-foreground">
                                                {isBulkCreateMode
                                                    ? 'Individual por producto'
                                                    : `${createForm.data.discount_value || '0.00'}%`}
                                            </p>
                                        </div>
                                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                            <p className="text-xs text-muted-foreground">Precio especial final</p>
                                            <p className="font-medium text-foreground">
                                                {isBulkCreateMode
                                                    ? 'Se calcula por producto'
                                                    : formatCurrencyLabel(createForm.data.special_price)}
                                            </p>
                                        </div>
                                    </div>

                                    {isBulkCreateMode && (
                                        <div className="space-y-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                                            <p className="text-sm font-medium text-foreground">
                                                Productos que se crearan
                                            </p>
                                            <div className="max-h-56 space-y-2 overflow-auto pr-1">
                                                {selectedProducts.map((product) => {
                                                    const productDiscountValue =
                                                        resolveCreateProductDiscountValue(product.id);

                                                    return (
                                                        <div
                                                            key={product.id}
                                                            className="grid gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs md:grid-cols-4"
                                                        >
                                                            <p className="font-medium text-foreground">{product.name}</p>
                                                            <p className="text-muted-foreground">
                                                                Original: {formatCurrencyLabel(product.original_price)}
                                                            </p>
                                                            <p className="text-foreground">
                                                                Descuento: {productDiscountValue || '0.00'}%
                                                            </p>
                                                            <p className="text-foreground">
                                                                Especial:{' '}
                                                                {formatCurrencyLabel(
                                                                    resolveSpecialPriceValue(
                                                                        product.original_price,
                                                                        productDiscountValue,
                                                                    ),
                                                                )}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                                        <p className="text-xs text-muted-foreground">Estado</p>
                                        <p className="font-medium text-foreground">
                                            {createForm.data.is_active ? 'Asignacion activa' : 'Asignacion inactiva'}
                                        </p>
                                    </div>

                                    <InputError message={createForm.errors.provider_id} />
                                    <InputError message={createForm.errors.product_ids} />
                                    <InputError message={createForm.errors.product_discounts} />
                                    <InputError message={createForm.errors.original_price} />
                                    <InputError message={createForm.errors.discount_value} />
                                    <InputError message={createForm.errors.special_price} />
                                    <InputError message={createForm.errors.is_active} />
                                </div>
                            )}

                            {createFlowError && (
                                <div className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {createFlowError}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                                {createStep > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={moveCreateBack}
                                    >
                                        <ChevronLeft />
                                        Volver
                                    </Button>
                                )}

                                {createStep === 1 && (
                                    <Button
                                        type="button"
                                        onClick={moveCreateToPricingStep}
                                        disabled={providers.length === 0 || products.length === 0}
                                    >
                                        Continuar con precio
                                        <ChevronRight />
                                    </Button>
                                )}

                                {createStep === 2 && (
                                    <Button
                                        type="button"
                                        onClick={moveCreateToReviewStep}
                                    >
                                        Revisar asignacion
                                        <ChevronRight />
                                    </Button>
                                )}

                                {createStep === 3 && (
                                    <Button
                                        type="submit"
                                        disabled={
                                            createForm.processing ||
                                            providers.length === 0 ||
                                            products.length === 0
                                        }
                                    >
                                        <CircleCheck />
                                        Crear asignacion
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-amber-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Buscar asignacion</CardTitle>
                        <CardDescription>
                            Filtra por proveedor, producto, codigo o barras.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. proveedor, COD-1000, 7701234567890"
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredAssignments.map((assignment) => (
                        <EditableAssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            providers={providers}
                            products={products}
                        />
                    ))}

                    {filteredAssignments.length === 0 && (
                        <Card>
                            <CardContent>
                                <p className="py-2 text-sm text-muted-foreground">
                                    No hay resultados para la busqueda actual.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

ProviderProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Asignaciones',
            href: index(),
        },
    ],
};
