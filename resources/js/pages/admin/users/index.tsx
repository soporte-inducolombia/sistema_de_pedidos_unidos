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
import { destroy, index, update } from '@/routes/admin/users';
import type { UserRole } from '@/types';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    created_at: string | null;
};

type Props = {
    users: ManagedUser[];
    roles: UserRole[];
    status?: string;
};

type SharedPageProps = {
    auth: {
        user: {
            id: number;
        };
    };
    errors: {
        delete?: string;
    };
};

function EditableUserCard({
    user,
    roles,
    currentUserId,
}: {
    user: ManagedUser;
    roles: UserRole[];
    currentUserId: number;
}) {
    const form = useForm<{
        name: string;
        email: string;
        role: UserRole;
    }>({
        name: user.name,
        email: user.email,
        role: user.role,
    });

    const createdAtLabel = user.created_at
        ? new Date(user.created_at).toLocaleString()
        : 'Sin fecha';

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url({ user: user.id }), {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara el usuario ${user.email}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ user: user.id }), {
            preserveScroll: true,
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    Creado: {createdAtLabel}
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor={`name-${user.id}`}
                                className="text-sm font-medium"
                            >
                                Nombre
                            </label>
                            <Input
                                id={`name-${user.id}`}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor={`email-${user.id}`}
                                className="text-sm font-medium"
                            >
                                Correo
                            </label>
                            <Input
                                id={`email-${user.id}`}
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                            />
                            <InputError message={form.errors.email} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor={`role-${user.id}`}
                            className="text-sm font-medium"
                        >
                            Rol
                        </label>
                        <select
                            id={`role-${user.id}`}
                            value={form.data.role}
                            onChange={(event) =>
                                form.setData('role', event.target.value as UserRole)
                            }
                            className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {roles.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.role} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Guardar cambios
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={form.processing || currentUserId === user.id}
                        >
                            Eliminar usuario
                        </Button>
                        {currentUserId === user.id && (
                            <span className="text-xs text-muted-foreground">
                                No puedes eliminar tu propio usuario.
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function UsersIndex({ users, roles, status }: Props) {
    const { auth, errors } = usePage<SharedPageProps>().props;

    return (
        <>
            <Head title="Administracion de usuarios" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de usuarios"
                    description="Gestiona usuarios y roles del sistema"
                />

                {status && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                )}

                {errors.delete && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.delete}
                    </div>
                )}

                <div className="grid gap-4">
                    {users.map((user) => (
                        <EditableUserCard
                            key={user.id}
                            user={user}
                            roles={roles}
                            currentUserId={auth.user.id}
                        />
                    ))}

                    {users.length === 0 && (
                        <Card>
                            <CardContent>
                                <p className="py-2 text-sm text-muted-foreground">
                                    No hay usuarios registrados.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: index(),
        },
    ],
};
