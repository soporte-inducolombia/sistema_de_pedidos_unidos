import { Head, useForm, usePage } from '@inertiajs/react';
import { Eye, PencilLine, Search, Trash2, UserCog, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { destroy, index, store, update } from '@/routes/admin/users';
import type { UserRole } from '@/types';

type ManagedUser = {
    id: number;
    name: string;
    username: string;
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
    const [isViewing, setIsViewing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<{
        name: string;
        username: string;
        role: UserRole;
        password: string;
        password_confirmation: string;
    }>({
        name: user.name,
        username: user.username,
        role: user.role,
        password: '',
        password_confirmation: '',
    });

    const createdAtLabel = user.created_at
        ? new Date(user.created_at).toLocaleString()
        : 'Sin fecha';

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.transform((data) => ({
            name: data.name,
            username: data.username,
            role: data.role,
            ...(data.password.trim().length > 0
                ? {
                      password: data.password,
                      password_confirmation: data.password_confirmation,
                  }
                : {}),
        }));

        form.patch(update.url({ user: user.id }), {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('password', '');
                form.setData('password_confirmation', '');
            },
        });
    };

    const handleDelete = () => {
        if (
            !window.confirm(
                `Se eliminara el usuario @${user.username}. Esta accion no se puede deshacer.`,
            )
        ) {
            return;
        }

        form.delete(destroy.url({ user: user.id }), {
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
        <Card className="overflow-hidden border-slate-200/70 shadow-sm dark:border-slate-800/80">
            <CardHeader className="gap-4 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>@{user.username}</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/5">
                        {user.role}
                    </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Creado: {createdAtLabel}
                    </p>

                    <div className="flex flex-wrap gap-2">
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
                            disabled={form.processing || currentUserId === user.id}
                        >
                            <Trash2 />
                            Eliminar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {isViewing && (
                <CardContent className="border-t border-cyan-500/15 bg-background/80">
                    <div className="grid gap-4 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Nombre
                            </p>
                            <p className="mt-1 font-medium text-foreground">{user.name}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Usuario
                            </p>
                            <p className="mt-1 font-medium text-foreground">@{user.username}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Rol
                            </p>
                            <p className="mt-1 font-medium text-foreground">{user.role}</p>
                        </div>
                    </div>

                    {currentUserId === user.id && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            No puedes eliminar tu propio usuario.
                        </p>
                    )}
                </CardContent>
            )}

            {isEditing && (
                <CardContent className="border-t border-dashed border-cyan-500/30 bg-cyan-500/3">
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
                                    htmlFor={`username-${user.id}`}
                                    className="text-sm font-medium"
                                >
                                    Usuario
                                </label>
                                <Input
                                    id={`username-${user.id}`}
                                    value={form.data.username}
                                    autoCapitalize="none"
                                    onChange={(event) =>
                                        form.setData('username', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.username} />
                                <p className="text-xs text-muted-foreground">
                                    Este usuario se usa para iniciar sesion.
                                </p>
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

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor={`password-${user.id}`}
                                    className="text-sm font-medium"
                                >
                                    Nueva contraseña (opcional)
                                </label>
                                <PasswordInput
                                    id={`password-${user.id}`}
                                    value={form.data.password}
                                    autoComplete="new-password"
                                    onChange={(event) =>
                                        form.setData('password', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.password} />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor={`password-confirmation-${user.id}`}
                                    className="text-sm font-medium"
                                >
                                    Confirmar contraseña
                                </label>
                                <PasswordInput
                                    id={`password-confirmation-${user.id}`}
                                    value={form.data.password_confirmation}
                                    autoComplete="new-password"
                                    onChange={(event) =>
                                        form.setData('password_confirmation', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.password_confirmation} />
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Si no quieres cambiar la contraseña, deja ambos campos vacíos.
                        </p>

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

export default function UsersIndex({ users, roles, status }: Props) {
    const { auth, errors } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState('');
    const createForm = useForm<{
        name: string;
        email: string;
        username: string;
        role: UserRole;
        password: string;
        password_confirmation: string;
    }>({
        name: '',
        email: '',
        username: '',
        role: roles[0] ?? 'provider',
        password: '',
        password_confirmation: '',
    });

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                createForm.setData('role', roles[0] ?? 'provider');
            },
        });
    };

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return users;
        }

        return users.filter((user) => {
            return (
                user.name.toLowerCase().includes(term) ||
                user.username.toLowerCase().includes(term) ||
                user.role.toLowerCase().includes(term)
            );
        });
    }, [search, users]);

    return (
        <>
            <Head title="Administracion de usuarios" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Administracion de usuarios"
                    description="Gestion intuitiva de cuentas con acciones rapidas por usuario"
                />

                <Card className="border-cyan-500/20 bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10">
                    <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total de usuarios
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <Users className="size-5 text-cyan-600" />
                                {users.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Roles disponibles
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                <UserCog className="size-5 text-sky-600" />
                                {roles.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/30 bg-background/70 p-3 backdrop-blur-sm dark:border-slate-700/60 md:col-span-2 lg:col-span-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Vista actual
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                Acciones separadas: ver, editar y eliminar
                            </p>
                        </div>
                    </CardContent>
                </Card>

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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Registrar usuario</CardTitle>
                        <CardDescription>
                            Solo administradores pueden crear usuarios del sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label htmlFor="create-user-name" className="text-sm font-medium">
                                        Nombre
                                    </label>
                                    <Input
                                        id="create-user-name"
                                        value={createForm.data.name}
                                        onChange={(event) =>
                                            createForm.setData('name', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.name} />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="create-user-email" className="text-sm font-medium">
                                        Correo
                                    </label>
                                    <Input
                                        id="create-user-email"
                                        type="email"
                                        value={createForm.data.email}
                                        onChange={(event) =>
                                            createForm.setData('email', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.email} />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="create-user-username" className="text-sm font-medium">
                                        Usuario
                                    </label>
                                    <Input
                                        id="create-user-username"
                                        value={createForm.data.username}
                                        autoCapitalize="none"
                                        onChange={(event) =>
                                            createForm.setData('username', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.username} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="create-user-role" className="text-sm font-medium">
                                    Rol
                                </label>
                                <select
                                    id="create-user-role"
                                    value={createForm.data.role}
                                    onChange={(event) =>
                                        createForm.setData('role', event.target.value as UserRole)
                                    }
                                    className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                >
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.role} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="create-user-password" className="text-sm font-medium">
                                        Contraseña
                                    </label>
                                    <PasswordInput
                                        id="create-user-password"
                                        value={createForm.data.password}
                                        autoComplete="new-password"
                                        onChange={(event) =>
                                            createForm.setData('password', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.password} />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="create-user-password-confirmation" className="text-sm font-medium">
                                        Confirmar contraseña
                                    </label>
                                    <PasswordInput
                                        id="create-user-password-confirmation"
                                        value={createForm.data.password_confirmation}
                                        autoComplete="new-password"
                                        onChange={(event) =>
                                            createForm.setData('password_confirmation', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.password_confirmation} />
                                </div>
                            </div>

                            <Button type="submit" disabled={createForm.processing}>
                                Registrar usuario
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-cyan-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Buscar usuario</CardTitle>
                        <CardDescription>
                            Filtra por nombre, usuario o rol.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ej. supervisor, proveedor_demo"
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredUsers.map((user) => (
                        <EditableUserCard
                            key={user.id}
                            user={user}
                            roles={roles}
                            currentUserId={auth.user.id}
                        />
                    ))}

                    {filteredUsers.length === 0 && (
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

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: index(),
        },
    ],
};
