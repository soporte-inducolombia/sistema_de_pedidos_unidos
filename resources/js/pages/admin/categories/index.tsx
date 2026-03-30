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
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/admin/categories';

type CategoryItem = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    products_count: number;
};

type Props = {
    categories: CategoryItem[];
    status?: string;
};

type SharedPageProps = {
    errors: {
        deleteCategory?: string;
    };
};

function EditableCategoryCard({ category }: { category: CategoryItem }) {
    const form = useForm<{
        name: string;
        slug: string;
        is_active: boolean;
    }>({
        name: category.name,
        slug: category.slug,
        is_active: category.is_active,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url({ category: category.id }), {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara la categoria ${category.name}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ category: category.id }), {
            preserveScroll: true,
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>{category.name}</CardTitle>
                        <CardDescription>{category.slug}</CardDescription>
                    </div>
                    <Badge variant="outline">
                        {category.products_count} productos
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor={`category-name-${category.id}`}
                                className="text-sm font-medium"
                            >
                                Nombre
                            </label>
                            <input
                                id={`category-name-${category.id}`}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor={`category-slug-${category.id}`}
                                className="text-sm font-medium"
                            >
                                Slug
                            </label>
                            <input
                                id={`category-slug-${category.id}`}
                                value={form.data.slug}
                                onChange={(event) =>
                                    form.setData('slug', event.target.value)
                                }
                                className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            />
                            <InputError message={form.errors.slug} />
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
                        Categoria activa
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
                            disabled={form.processing || category.products_count > 0}
                        >
                            Eliminar categoria
                        </Button>
                        {category.products_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                                Elimina o mueve sus productos antes de borrarla.
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function CategoriesIndex({ categories, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;

    const createForm = useForm<{
        name: string;
        slug: string;
        is_active: boolean;
    }>({
        name: '',
        slug: '',
        is_active: true,
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    return (
        <>
            <Head title="Administracion de categorias" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de categorias"
                    description="Gestiona el catalogo base para tus productos"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {errors.deleteCategory && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.deleteCategory}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Crear categoria</CardTitle>
                        <CardDescription>
                            Define una nueva categoria para organizar productos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2 md:col-span-2">
                                    <label
                                        htmlFor="new-category-name"
                                        className="text-sm font-medium"
                                    >
                                        Nombre
                                    </label>
                                    <input
                                        id="new-category-name"
                                        value={createForm.data.name}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        placeholder="Ej. Linea institucional"
                                    />
                                    <InputError message={createForm.errors.name} />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-category-slug"
                                        className="text-sm font-medium"
                                    >
                                        Slug (opcional)
                                    </label>
                                    <input
                                        id="new-category-slug"
                                        value={createForm.data.slug}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'slug',
                                                event.target.value,
                                            )
                                        }
                                        className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        placeholder="linea-institucional"
                                    />
                                    <InputError message={createForm.errors.slug} />
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
                                Categoria activa
                            </label>

                            <Button type="submit" disabled={createForm.processing}>
                                Crear categoria
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {categories.map((category) => (
                        <EditableCategoryCard key={category.id} category={category} />
                    ))}
                </div>
            </div>
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Categorias',
            href: index(),
        },
    ],
};
