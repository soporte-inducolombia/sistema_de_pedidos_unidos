import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const copCurrencyFormatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function formatCopCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return '$0,00';
    }

    const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value;

    if (Number.isNaN(numericValue)) {
        return '$0,00';
    }

    return `$${copCurrencyFormatter.format(numericValue)}`;
}
