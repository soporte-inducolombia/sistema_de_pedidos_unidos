import { Link, usePage } from '@inertiajs/react';
import {
    Boxes,
    ClipboardList,
    ClipboardSignature,
    LayoutGrid,
    PackageSearch,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminProviderProductsIndex } from '@/routes/admin/provider-products';
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as providerOrdersIndex } from '@/routes/provider/orders';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;

    const mainNavItems: NavItem[] = [
        {
            title: 'Panel',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    if (auth.user.role === 'admin') {
        mainNavItems.push({
            title: 'Pedidos',
            href: adminOrdersIndex(),
            icon: ClipboardList,
        });

        mainNavItems.push({
            title: 'Productos',
            href: adminProductsIndex(),
            icon: PackageSearch,
        });

        mainNavItems.push({
            title: 'Asignaciones',
            href: adminProviderProductsIndex(),
            icon: Boxes,
        });

        mainNavItems.push({
            title: 'Usuarios',
            href: adminUsersIndex(),
            icon: Users,
        });

        mainNavItems.push({
            title: 'Roles',
            href: adminRolesIndex(),
            icon: ShieldCheck,
        });

        mainNavItems.push({
            title: 'Papelera',
            href: '/admin/recycle-bin',
            icon: Trash2,
        });
    }

    if (auth.user.role === 'provider' || auth.user.role === 'proveedor') {
        mainNavItems.push({
            title: 'Pedidos',
            href: providerOrdersIndex(),
            icon: ClipboardSignature,
        });
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="mt-auto">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
