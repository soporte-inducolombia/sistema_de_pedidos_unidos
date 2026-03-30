import { Head, useForm, usePage } from '@inertiajs/react';
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
import { Input } from '@/components/ui/input';
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/admin/products';

type ProductItem = {
    id: number;
    category_id: number;
    category_name: string | null;
    sku: string;
    name: string;
    description: string | null;
    original_price: string;
    is_active: boolean;
    provider_products_count: number;
};

type CategoryOption = {
    id: number;
    name: string;
    is_active: boolean;
};

type Props = {
    products: ProductItem[];
    categories: CategoryOption[];
    status?: string;
};

type SharedPageProps = {
    errors: {
        deleteProduct?: string;
    };
};

function EditableProductCard({
    product,
    categories,
}: {
    product: ProductItem;
    categories: CategoryOption[];
}) {
    const form = useForm<{
        category_id: number;
        sku: string;
        name: string;
        description: string;
        original_price: string;
        is_active: boolean;
    }>({
        category_id: product.category_id,
        sku: product.sku,
        name: product.name,
        description: product.description ?? '',
        original_price: product.original_price,
        is_active: product.is_active,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url({ product: product.id }), {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara el producto ${product.name}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ product: product.id }), {
            preserveScroll: true,
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>
                            {product.sku} • {product.category_name ?? 'Sin categoria'}
                        </CardDescription>
                    </div>
                    <Badge variant="outline">
                        {product.provider_products_count} asignaciones
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <label
                                htmlFor={`product-category-${product.id}`}
                                className="text-sm font-medium"
                            >
                                Categoria
                            </label>
                            <select
                                id={`product-category-${product.id}`}
                                value={form.data.category_id}
                                onChange={(event) =>
                                    form.setData(
                                        'category_id',
                                        Number(event.target.value),
                                    )
                                }
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            >
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.category_id} />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor={`product-sku-${product.id}`}
                                className="text-sm font-medium"
                            >
                                SKU
                            </label>
                            <Input
                                id={`product-sku-${product.id}`}
                                value={form.data.sku}
                                onChange={(event) =>
                                    form.setData('sku', event.target.value)
                                }
                            />
                            <InputError message={form.errors.sku} />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor={`product-price-${product.id}`}
                                className="text-sm font-medium"
                            >
                                Precio original
                            </label>
                            <Input
                                id={`product-price-${product.id}`}
                                value={form.data.original_price}
                                onChange={(event) =>
                                    form.setData(
                                        'original_price',
                                        event.target.value,
                                    )
                                }
                                inputMode="decimal"
                            />
                            <InputError message={form.errors.original_price} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor={`product-name-${product.id}`}
                            className="text-sm font-medium"
                        >
                            Nombre
                        </label>
                        <Input
                            id={`product-name-${product.id}`}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor={`product-description-${product.id}`}
                            className="text-sm font-medium"
                        >
                            Descripcion
                        </label>
                        <textarea
                            id={`product-description-${product.id}`}
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            rows={3}
                            className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        />
                        <InputError message={form.errors.description} />
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
                        Producto activo
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
                            disabled={
                                form.processing ||
                                product.provider_products_count > 0
                            }
                        >
                            Eliminar producto
                        </Button>
                        {product.provider_products_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                                El producto tiene proveedores asignados.
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ProductsIndex({ products, categories, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;

    const createForm = useForm<{
        category_id: number | '';
        sku: string;
        name: string;
        description: string;
        original_price: string;
        is_active: boolean;
    }>({
        category_id: categories[0]?.id ?? '',
        sku: '',
        name: '',
        description: '',
        original_price: '',
        is_active: true,
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                createForm.setData('category_id', categories[0]?.id ?? '');
                createForm.setData('is_active', true);
            },
        });
    };

    const activeCategories = categories.filter((category) => category.is_active);

    return (
        <>
            <Head title="Administracion de productos" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de productos"
                    description="Gestiona el catalogo comercial y sus precios base"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {errors.deleteProduct && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.deleteProduct}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Crear producto</CardTitle>
                        <CardDescription>
                            Define productos base para asignarlos a proveedores.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-category"
                                        className="text-sm font-medium"
                                    >
                                        Categoria
                                    </label>
                                    <select
                                        id="new-product-category"
                                        value={createForm.data.category_id}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'category_id',
                                                Number(event.target.value),
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        disabled={activeCategories.length === 0}
                                    >
                                        {activeCategories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={createForm.errors.category_id}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-sku"
                                        className="text-sm font-medium"
                                    >
                                        SKU
                                    </label>
                                    <Input
                                        id="new-product-sku"
                                        value={createForm.data.sku}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'sku',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="SKU-0001"
                                    />
                                    <InputError message={createForm.errors.sku} />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-price"
                                        className="text-sm font-medium"
                                    >
                                        Precio original
                                    </label>
                                    <Input
                                        id="new-product-price"
                                        value={createForm.data.original_price}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'original_price',
                                                event.target.value,
                                            )
                                        }
                                        inputMode="decimal"
                                        placeholder="0.00"
                                    />
                                    <InputError
                                        message={createForm.errors.original_price}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="new-product-name"
                                    className="text-sm font-medium"
                                >
                                    Nombre
                                </label>
                                <Input
                                    id="new-product-name"
                                    value={createForm.data.name}
                                    onChange={(event) =>
                                        createForm.setData('name', event.target.value)
                                    }
                                    placeholder="Ej. Cuaderno argollado premium"
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="new-product-description"
                                    className="text-sm font-medium"
                                >
                                    Descripcion
                                </label>
                                <textarea
                                    id="new-product-description"
                                    value={createForm.data.description}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    rows={3}
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                />
                                <InputError
                                    message={createForm.errors.description}
                                />
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
                                Producto activo
                            </label>

                            <Button
                                type="submit"
                                disabled={
                                    createForm.processing ||
                                    activeCategories.length === 0
                                }
                            >
                                Crear producto
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {products.map((product) => (
                        <EditableProductCard
                            key={product.id}
                            product={product}
                            categories={categories}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Productos',
            href: index(),
        },
    ],
};
