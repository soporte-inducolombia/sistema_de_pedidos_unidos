import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
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
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/admin/provider-products';

type Assignment = {
    id: number;
    provider_id: number;
    provider_name: string | null;
    provider_email: string | null;
    product_id: number;
    product_name: string | null;
    product_sku: string | null;
    product_original_price: string | null;
    category_name: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: string;
    special_price: string;
    is_active: boolean;
};

type ProviderOption = {
    id: number;
    company_name: string;
    user_email: string | null;
};

type ProductOption = {
    id: number;
    name: string;
    sku: string;
    category_name: string | null;
    original_price: string;
};

type Props = {
    assignments: Assignment[];
    providers: ProviderOption[];
    products: ProductOption[];
    status?: string;
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
    const form = useForm<{
        provider_id: number;
        product_id: number;
        discount_type: 'percent' | 'fixed';
        discount_value: string;
        is_active: boolean;
    }>({
        provider_id: assignment.provider_id,
        product_id: assignment.product_id,
        discount_type: assignment.discount_type,
        discount_value: assignment.discount_value,
        is_active: assignment.is_active,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>
                            {assignment.product_name} ({assignment.product_sku})
                        </CardTitle>
                        <CardDescription>
                            {assignment.provider_name} • {assignment.provider_email}
                        </CardDescription>
                    </div>
                    <Badge variant="outline">
                        Precio especial: ${assignment.special_price}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
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
                                        {provider.company_name} ({provider.user_email})
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
                                onChange={(event) =>
                                    form.setData(
                                        'product_id',
                                        Number(event.target.value),
                                    )
                                }
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            >
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.product_id} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor={`assignment-discount-type-${assignment.id}`}
                                className="text-sm font-medium"
                            >
                                Tipo de descuento
                            </label>
                            <select
                                id={`assignment-discount-type-${assignment.id}`}
                                value={form.data.discount_type}
                                onChange={(event) =>
                                    form.setData(
                                        'discount_type',
                                        event.target
                                            .value as Assignment['discount_type'],
                                    )
                                }
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            >
                                <option value="percent">Porcentaje (%)</option>
                                <option value="fixed">Valor fijo</option>
                            </select>
                            <InputError message={form.errors.discount_type} />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor={`assignment-discount-value-${assignment.id}`}
                                className="text-sm font-medium"
                            >
                                Valor de descuento
                            </label>
                            <input
                                id={`assignment-discount-value-${assignment.id}`}
                                value={form.data.discount_value}
                                onChange={(event) =>
                                    form.setData(
                                        'discount_value',
                                        event.target.value,
                                    )
                                }
                                inputMode="decimal"
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            />
                            <InputError message={form.errors.discount_value} />
                        </div>
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
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={form.processing}
                        >
                            Eliminar asignacion
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ProviderProductsIndex({
    assignments,
    providers,
    products,
    status,
}: Props) {
    const createForm = useForm<{
        provider_id: number | '';
        product_id: number | '';
        discount_type: 'percent' | 'fixed';
        discount_value: string;
        is_active: boolean;
    }>({
        provider_id: providers[0]?.id ?? '',
        product_id: products[0]?.id ?? '',
        discount_type: 'percent',
        discount_value: '0',
        is_active: true,
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                createForm.setData('provider_id', providers[0]?.id ?? '');
                createForm.setData('product_id', products[0]?.id ?? '');
                createForm.setData('discount_type', 'percent');
                createForm.setData('discount_value', '0');
                createForm.setData('is_active', true);
            },
        });
    };

    return (
        <>
            <Head title="Asignaciones proveedor-producto" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Asignaciones proveedor-producto"
                    description="Configura descuentos y precios especiales por proveedor"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Crear asignacion</CardTitle>
                        <CardDescription>
                            Selecciona proveedor y producto para definir su descuento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-assignment-provider"
                                        className="text-sm font-medium"
                                    >
                                        Proveedor
                                    </label>
                                    <select
                                        id="new-assignment-provider"
                                        value={createForm.data.provider_id}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'provider_id',
                                                Number(event.target.value),
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        disabled={providers.length === 0}
                                    >
                                        {providers.map((provider) => (
                                            <option key={provider.id} value={provider.id}>
                                                {provider.company_name} ({provider.user_email})
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={createForm.errors.provider_id}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-assignment-product"
                                        className="text-sm font-medium"
                                    >
                                        Producto
                                    </label>
                                    <select
                                        id="new-assignment-product"
                                        value={createForm.data.product_id}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'product_id',
                                                Number(event.target.value),
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        disabled={products.length === 0}
                                    >
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} ({product.sku}) - $
                                                {product.original_price}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={createForm.errors.product_id}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-assignment-discount-type"
                                        className="text-sm font-medium"
                                    >
                                        Tipo de descuento
                                    </label>
                                    <select
                                        id="new-assignment-discount-type"
                                        value={createForm.data.discount_type}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'discount_type',
                                                event.target.value as
                                                    | 'percent'
                                                    | 'fixed',
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    >
                                        <option value="percent">Porcentaje (%)</option>
                                        <option value="fixed">Valor fijo</option>
                                    </select>
                                    <InputError
                                        message={createForm.errors.discount_type}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-assignment-discount-value"
                                        className="text-sm font-medium"
                                    >
                                        Valor de descuento
                                    </label>
                                    <input
                                        id="new-assignment-discount-value"
                                        value={createForm.data.discount_value}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'discount_value',
                                                event.target.value,
                                            )
                                        }
                                        inputMode="decimal"
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    />
                                    <InputError
                                        message={createForm.errors.discount_value}
                                    />
                                </div>
                            </div>

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

                            <Button
                                type="submit"
                                disabled={
                                    createForm.processing ||
                                    providers.length === 0 ||
                                    products.length === 0
                                }
                            >
                                Crear asignacion
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {assignments.map((assignment) => (
                        <EditableAssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            providers={providers}
                            products={products}
                        />
                    ))}
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
