import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Boxes,
    CircleDollarSign,
    Eye,
    PackagePlus,
    PencilLine,
    Search,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { formatCopCurrency } from '@/lib/utils';
import { destroy, index, store, update } from '@/routes/admin/products';

type ProductItem = {
    id: number;
    code: string;
    barcode: string;
    name: string;
    description: string | null;
    original_price: string;
    packaging_multiple: number;
    is_active: boolean;
    provider_products_count: number;
};

type Props = {
    products: ProductItem[];
    status?: string;
};

type SharedPageProps = {
    errors: {
        deleteProduct?: string;
    };
};

function EditableProductCard({
    product,
}: {
    product: ProductItem;
}) {
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<{
        code: string;
        barcode: string;
        name: string;
        description: string;
        original_price: string;
        packaging_multiple: number;
        is_active: boolean;
    }>({
        code: product.code,
        barcode: product.barcode,
        name: product.name,
        description: product.description ?? '',
        original_price: product.original_price,
        packaging_multiple: product.packaging_multiple,
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

    const toggleView = () => {
        setIsViewing((previous) => !previous);
    };

    const toggleEdit = () => {
        setIsEditing((previous) => !previous);
        setIsViewing(true);
    };

    return (
        <Card className="overflow-hidden border-emerald-500/20 shadow-sm">
            <CardHeader className="gap-4 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>
                            COD {product.code} • Barras {product.barcode}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/5"
                    >
                        {product.provider_products_count} asignaciones
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
                    >
                        <PencilLine />
                        Editar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={
                            form.processing || product.provider_products_count > 0
                        }
                    >
                        <Trash2 />
                        Eliminar
                    </Button>
                </div>
            </CardHeader>

            {isViewing && (
                <CardContent className="border-t border-emerald-500/15 bg-background/80">
                    <div className="grid gap-4 text-sm md:grid-cols-5">
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Codigo
                            </p>
                            <p className="mt-1 font-medium text-foreground">{product.code}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Codigo de barras
                            </p>
                            <p className="mt-1 font-medium text-foreground">{product.barcode}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Precio base
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {formatCopCurrency(product.original_price)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Embalaje minimo
                            </p>
                            <p className="mt-1 font-medium text-foreground">x{product.packaging_multiple}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Estado
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {product.is_active ? 'Activo' : 'Inactivo'}
                            </p>
                        </div>
                    </div>

                    {product.description && (
                        <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Descripcion
                            </p>
                            <p className="mt-1 text-foreground">{product.description}</p>
                        </div>
                    )}

                    {product.provider_products_count > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            El producto tiene proveedores asignados y no puede eliminarse.
                        </p>
                    )}
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="border-t border-dashed border-emerald-500/30 bg-emerald-500/3">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor={`product-code-${product.id}`}
                                    className="text-sm font-medium"
                                >
                                    Codigo
                                </label>
                                <Input
                                    id={`product-code-${product.id}`}
                                    value={form.data.code}
                                    onChange={(event) =>
                                        form.setData('code', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.code} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`product-barcode-${product.id}`}
                                    className="text-sm font-medium"
                                >
                                    Codigo de barras
                                </label>
                                <Input
                                    id={`product-barcode-${product.id}`}
                                    value={form.data.barcode}
                                    onChange={(event) =>
                                        form.setData('barcode', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.barcode} />
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
                                        form.setData('original_price', event.target.value)
                                    }
                                    inputMode="decimal"
                                />
                                <InputError message={form.errors.original_price} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`product-packaging-${product.id}`}
                                    className="text-sm font-medium"
                                >
                                    Embalaje minimo
                                </label>
                                <Input
                                    id={`product-packaging-${product.id}`}
                                    value={form.data.packaging_multiple}
                                    onChange={(event) =>
                                        form.setData(
                                            'packaging_multiple',
                                            Number(event.target.value || 1),
                                        )
                                    }
                                    inputMode="numeric"
                                    min={1}
                                    type="number"
                                />
                                <InputError message={form.errors.packaging_multiple} />
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

export default function ProductsIndex({ products, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState('');

    const createForm = useForm<{
        code: string;
        barcode: string;
        name: string;
        description: string;
        original_price: string;
        packaging_multiple: number;
        is_active: boolean;
    }>({
        code: '',
        barcode: '',
        name: '',
        description: '',
        original_price: '',
        packaging_multiple: 1,
        is_active: true,
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                createForm.setData('is_active', true);
            },
        });
    };

    const activeProducts = products.filter((product) => product.is_active).length;

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return products;
        }

        return products.filter((product) => {
            return (
                product.name.toLowerCase().includes(term) ||
                product.code.toLowerCase().includes(term) ||
                product.barcode.toLowerCase().includes(term)
            );
        });
    }, [products, search]);

    return (
        <>
            <Head title="Administracion de productos" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de productos"
                    description="Gestiona el catalogo con un flujo mas rapido y visual"
                />

                <Card className="border-emerald-500/25 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
                    <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Productos registrados
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Boxes className="size-5 text-emerald-600" />
                                {products.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Productos activos
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Boxes className="size-5 text-teal-600" />
                                {activeProducts}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Precio promedio visible
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <CircleDollarSign className="size-5 text-cyan-600" />
                                {products.length > 0
                                    ? formatCopCurrency(
                                          products.reduce((sum, product) => {
                                              return (
                                                  sum +
                                                  Number.parseFloat(
                                                      product.original_price,
                                                  )
                                              );
                                          }, 0) / products.length,
                                      )
                                    : '$0,00'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

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
                        <CardTitle className="flex items-center gap-2">
                            <PackagePlus className="size-4 text-emerald-600" />
                            Crear producto
                        </CardTitle>
                        <CardDescription>
                            Define productos base para asignarlos a proveedores.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-code"
                                        className="text-sm font-medium"
                                    >
                                        Codigo
                                    </label>
                                    <Input
                                        id="new-product-code"
                                        value={createForm.data.code}
                                        onChange={(event) =>
                                            createForm.setData('code', event.target.value)
                                        }
                                        placeholder="COD-0001"
                                    />
                                    <InputError message={createForm.errors.code} />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-barcode"
                                        className="text-sm font-medium"
                                    >
                                        Codigo de barras
                                    </label>
                                    <Input
                                        id="new-product-barcode"
                                        value={createForm.data.barcode}
                                        onChange={(event) =>
                                            createForm.setData('barcode', event.target.value)
                                        }
                                        placeholder="7701234567890"
                                    />
                                    <InputError message={createForm.errors.barcode} />
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

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-product-packaging"
                                        className="text-sm font-medium"
                                    >
                                        Embalaje minimo
                                    </label>
                                    <Input
                                        id="new-product-packaging"
                                        value={createForm.data.packaging_multiple}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'packaging_multiple',
                                                Number(event.target.value || 1),
                                            )
                                        }
                                        inputMode="numeric"
                                        min={1}
                                        type="number"
                                        placeholder="1"
                                    />
                                    <InputError
                                        message={createForm.errors.packaging_multiple}
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
                                        createForm.setData('description', event.target.value)
                                    }
                                    rows={3}
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                />
                                <InputError message={createForm.errors.description} />
                            </div>

                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={createForm.data.is_active}
                                    onChange={(event) =>
                                        createForm.setData('is_active', event.target.checked)
                                    }
                                    className="size-4 rounded border"
                                />
                                Producto activo
                            </label>

                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Crear producto
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Buscar producto</CardTitle>
                        <CardDescription>
                            Filtra por nombre, codigo o codigo de barras.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. cuaderno, COD-1000, 7701234567890"
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredProducts.map((product) => (
                        <EditableProductCard
                            key={product.id}
                            product={product}
                        />
                    ))}

                    {filteredProducts.length === 0 && (
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

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Productos',
            href: index(),
        },
    ],
};
