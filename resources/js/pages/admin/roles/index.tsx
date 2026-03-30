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

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>{role.name}</CardTitle>
                        <CardDescription>{role.slug}</CardDescription>
                    </div>
                    <Badge variant="outline">{role.users_count} usuarios</Badge>
                </div>
            </CardHeader>
            <CardContent>
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
                            {isAdminRole && (
                                <p className="text-xs text-muted-foreground">
                                    El slug del rol admin no se puede modificar.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Guardar cambios
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={
                                form.processing || isAdminRole || hasAssignedUsers
                            }
                        >
                            Eliminar rol
                        </Button>
                        {hasAssignedUsers && (
                            <span className="text-xs text-muted-foreground">
                                No puedes eliminar roles con usuarios asignados.
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RolesIndex({ roles, status }: Props) {
    const { errors } = usePage<SharedPageProps>().props;

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

    return (
        <>
            <Head title="Administracion de roles" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de roles"
                    description="Crea, edita y elimina roles del sistema"
                />

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
                        <CardTitle>Crear rol</CardTitle>
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

                <div className="grid gap-4">
                    {roles.map((role) => (
                        <EditableRoleCard key={role.id} role={role} />
                    ))}
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
