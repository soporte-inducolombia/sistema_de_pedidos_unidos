import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Eye,
    PencilLine,
    Search,
    ShieldCheck,
    ShieldPlus,
    Trash2,
    Users,
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
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/admin/roles';

type RoleItem = {
    id: number;
    name: string;
    slug: string;
    users_count: number;
};

type Props = {
    roles: RoleItem[];
    status?: string;
};

type SharedPageProps = {
    errors: {
        deleteRole?: string;
        updateRole?: string;
    };
};

function EditableRoleCard({ role }: { role: RoleItem }) {
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<{
        name: string;
        slug: string;
    }>({
        name: role.name,
        slug: role.slug,
    });

    const isAdminRole = role.slug === 'admin';
    const hasAssignedUsers = role.users_count > 0;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url({ role: role.id }), {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara el rol ${role.slug}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ role: role.id }), {
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
        <Card className="overflow-hidden border-indigo-500/20 shadow-sm">
            <CardHeader className="gap-4 bg-linear-to-r from-indigo-500/10 via-violet-500/10 to-sky-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>{role.name}</CardTitle>
                        <CardDescription>{role.slug}</CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className="border-indigo-500/30 bg-indigo-500/5"
                    >
                        {role.users_count} usuarios
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
                        disabled={form.processing || isAdminRole || hasAssignedUsers}
                    >
                        <Trash2 />
                        Eliminar
                    </Button>
                </div>
            </CardHeader>
            {isViewing && (
                <CardContent className="border-t border-indigo-500/15 bg-background/80">
                    <div className="grid gap-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Nombre
                            </p>
                            <p className="mt-1 font-medium text-foreground">{role.name}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Slug
                            </p>
                            <p className="mt-1 font-medium text-foreground">{role.slug}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Usuarios asignados
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {role.users_count}
                            </p>
                        </div>
                    </div>

                    {isAdminRole && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            El slug del rol admin no se puede modificar ni eliminar.
                        </p>
                    )}

                    {hasAssignedUsers && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            No puedes eliminar roles con usuarios asignados.
                        </p>
                    )}
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="border-t border-dashed border-indigo-500/30 bg-indigo-500/3">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor={`role-name-${role.id}`}
                                    className="text-sm font-medium"
                                >
                                    Nombre del rol
                                </label>
                                <Input
                                    id={`role-name-${role.id}`}
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`role-slug-${role.id}`}
                                    className="text-sm font-medium"
                                >
                                    Slug del rol
                                </label>
                                <Input
                                    id={`role-slug-${role.id}`}
                                    value={form.data.slug}
                                    onChange={(event) =>
                                        form.setData('slug', event.target.value)
                                    }
                                    disabled={isAdminRole}
                                />
                                <InputError message={form.errors.slug} />
                            </div>
                        </div>

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

export default function RolesIndex({ roles, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState('');

    const createForm = useForm<{
        name: string;
        slug: string;
    }>({
        name: '',
        slug: '',
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
            },
        });
    };

    const filteredRoles = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return roles;
        }

        return roles.filter((role) => {
            return (
                role.name.toLowerCase().includes(term) ||
                role.slug.toLowerCase().includes(term)
            );
        });
    }, [roles, search]);

    return (
        <>
            <Head title="Administracion de roles" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de roles"
                    description="Controla permisos de forma clara con acciones por rol"
                />

                <Card className="border-indigo-500/25 bg-linear-to-r from-indigo-500/10 via-violet-500/10 to-sky-500/10">
                    <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Roles creados
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <ShieldCheck className="size-5 text-indigo-600" />
                                {roles.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Con usuarios
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Users className="size-5 text-violet-600" />
                                {roles.filter((role) => role.users_count > 0).length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Rol protegido
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                admin siempre activo
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {errors.updateRole && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.updateRole}
                    </div>
                )}

                {errors.deleteRole && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.deleteRole}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldPlus className="size-4 text-indigo-600" />
                            Crear rol
                        </CardTitle>
                        <CardDescription>
                            Define un nuevo rol para asignarlo a usuarios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-role-name"
                                        className="text-sm font-medium"
                                    >
                                        Nombre
                                    </label>
                                    <Input
                                        id="new-role-name"
                                        value={createForm.data.name}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ej. Supervisor Comercial"
                                    />
                                    <InputError
                                        message={createForm.errors.name}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="new-role-slug"
                                        className="text-sm font-medium"
                                    >
                                        Slug
                                    </label>
                                    <Input
                                        id="new-role-slug"
                                        value={createForm.data.slug}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'slug',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ej. supervisor-comercial"
                                    />
                                    <InputError
                                        message={createForm.errors.slug}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Crear rol
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-indigo-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Buscar rol</CardTitle>
                        <CardDescription>
                            Encuentra rapidamente por nombre o slug.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. supervisor o supervisor-comercial"
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredRoles.map((role) => (
                        <EditableRoleCard key={role.id} role={role} />
                    ))}

                    {filteredRoles.length === 0 && (
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

RolesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Roles',
            href: index(),
        },
    ],
};
