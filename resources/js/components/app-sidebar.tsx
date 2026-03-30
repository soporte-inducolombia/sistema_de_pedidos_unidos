import { Link, usePage } from '@inertiajs/react';
import {
    Boxes,
    LayoutGrid,
    PackageSearch,
    ShieldCheck,
    Tags,
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
import { index as adminCategoriesIndex } from '@/routes/admin/categories';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminProviderProductsIndex } from '@/routes/admin/provider-products';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    if (auth.user.role === 'admin') {
        mainNavItems.push({
            title: 'Categorias',
            href: adminCategoriesIndex(),
            icon: Tags,
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
