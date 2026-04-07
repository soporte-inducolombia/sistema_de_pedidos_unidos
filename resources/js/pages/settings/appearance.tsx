import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Configuracion de apariencia" />

            <h1 className="sr-only">Configuracion de apariencia</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Configuracion de apariencia"
                    description="Actualiza la apariencia de tu cuenta"
                />
                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Configuracion de apariencia',
            href: editAppearance(),
        },
    ],
};
