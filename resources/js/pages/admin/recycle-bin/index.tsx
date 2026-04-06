import { Head, router, usePage } from '@inertiajs/react';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
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

type TrashEntity =
    | 'users'
    | 'products'
    | 'provider-products'
    | 'roles'
    | 'categories'
    | 'orders';

type RecycleItem = {
    entity: TrashEntity;
    entity_label: string;
    id: number;
    title: string;
    subtitle: string;
    deleted_at: string | null;
};

type Props = {
    items: RecycleItem[];
    status?: string;
};

type SharedPageProps = {
    errors: {
        restore?: string;
    };
};

const entityOptions: Array<{ value: 'all' | TrashEntity; label: string }> = [
    { value: 'all', label: 'Todo' },
    { value: 'users', label: 'Usuarios' },
    { value: 'products', label: 'Productos' },
    { value: 'provider-products', label: 'Asignaciones' },
    { value: 'roles', label: 'Roles' },
    { value: 'categories', label: 'Categorias' },
    { value: 'orders', label: 'Pedidos' },
];

export default function RecycleBinIndex({ items, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState('');
    const [entity, setEntity] = useState<'all' | TrashEntity>('all');
    const [restoringKey, setRestoringKey] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        const term = search.trim().toLowerCase();

        return items.filter((item) => {
            const matchesEntity = entity === 'all' ? true : item.entity === entity;

            if (!matchesEntity) {
                return false;
            }

            if (!term) {
                return true;
            }

            return (
                item.title.toLowerCase().includes(term) ||
                item.subtitle.toLowerCase().includes(term) ||
                item.entity_label.toLowerCase().includes(term)
            );
        });
    }, [entity, items, search]);

    const handleRestore = (item: RecycleItem) => {
        const key = `${item.entity}-${item.id}`;
        setRestoringKey(key);

        router.post(
            `/admin/recycle-bin/${item.entity}/${item.id}/restore`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setRestoringKey(null),
            },
        );
    };

    return (
        <>
            <Head title="Papelera de reciclaje" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Papelera de reciclaje"
                    description="Consulta y restaura rapidamente los elementos eliminados del sistema"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {errors.restore && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.restore}
                    </div>
                )}

                <Card className="border-rose-500/20 bg-linear-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10">
                    <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Elementos en papelera
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Trash2 className="size-5 text-rose-600" />
                                {items.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60 md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Restauracion rapida
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                                Puedes restaurar con un clic. Solo administradores tienen acceso.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Filtrar papelera</CardTitle>
                        <CardDescription>
                            Busca por nombre y limita por tipo de elemento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        <div className="relative md:col-span-2">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. usuario, producto, pedido"
                                className="pl-9"
                            />
                        </div>

                        <select
                            value={entity}
                            onChange={(event) => setEntity(event.target.value as 'all' | TrashEntity)}
                            className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {entityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Elementos eliminados</CardTitle>
                        <CardDescription>
                            Selecciona un registro para restaurarlo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredItems.map((item) => {
                            const key = `${item.entity}-${item.id}`;
                            const deletedAtLabel = item.deleted_at
                                ? new Date(item.deleted_at).toLocaleString()
                                : 'Sin fecha';

                            return (
                                <div
                                    key={key}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-foreground">{item.title}</p>
                                            <Badge variant="outline">{item.entity_label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Eliminado: {deletedAtLabel}
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleRestore(item)}
                                        disabled={restoringKey === key}
                                    >
                                        <RotateCcw />
                                        Restaurar
                                    </Button>
                                </div>
                            );
                        })}

                        {filteredItems.length === 0 && (
                            <p className="py-2 text-sm text-muted-foreground">
                                No hay elementos en papelera para este filtro.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

RecycleBinIndex.layout = {
    breadcrumbs: [
        {
            title: 'Papelera',
            href: '/admin/recycle-bin',
        },
    ],
};
