import { router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error';

type ToastItem = {
    id: number;
    type: ToastType;
    message: string;
};

type PageLike = {
    props?: {
        status?: unknown;
        errors?: unknown;
    };
};

const TOAST_DURATION_MS = 4500;
const DEDUPE_WINDOW_MS = 800;

const collectErrorMessages = (errors: unknown): string[] => {
    if (errors === null || errors === undefined) {
        return [];
    }

    if (typeof errors === 'string') {
        const trimmedError = errors.trim();

        return trimmedError === '' ? [] : [trimmedError];
    }

    if (Array.isArray(errors)) {
        return errors.flatMap((error) => collectErrorMessages(error));
    }

    if (typeof errors === 'object') {
        return Object.values(errors).flatMap((error) => collectErrorMessages(error));
    }

    return [];
};

export default function GlobalActionToasts() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const idRef = useRef(1);
    const dedupeRef = useRef<Map<string, number>>(new Map());

    const pushToast = useCallback((type: ToastType, message: string) => {
        const normalizedMessage = message.trim();

        if (normalizedMessage === '') {
            return;
        }

        const dedupeKey = `${type}:${normalizedMessage}`;
        const now = Date.now();
        const previous = dedupeRef.current.get(dedupeKey);

        if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) {
            return;
        }

        dedupeRef.current.set(dedupeKey, now);

        const toastId = idRef.current++;

        setToasts((currentToasts) => [
            ...currentToasts,
            {
                id: toastId,
                type,
                message: normalizedMessage,
            },
        ]);

        window.setTimeout(() => {
            setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
        }, TOAST_DURATION_MS);
    }, []);

    const removeToast = useCallback((toastId: number) => {
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
    }, []);

    const processPageFeedback = useCallback((page: PageLike) => {
        const status = page.props?.status;

        if (typeof status === 'string' && status.trim() !== '') {
            pushToast('success', status);
        }

        const errorMessages = collectErrorMessages(page.props?.errors);

        if (errorMessages.length > 0) {
            pushToast('error', errorMessages[0]);
        }
    }, [pushToast]);

    useEffect(() => {
        const removeSuccessListener = router.on('success', (event) => {
            processPageFeedback(event.detail.page as PageLike);
        });

        const removeErrorListener = router.on('error', (event) => {
            processPageFeedback({ props: { errors: event.detail.errors } });
        });

        return () => {
            removeSuccessListener();
            removeErrorListener();
        };
    }, [processPageFeedback]);

    const orderedToasts = useMemo(() => {
        return [...toasts].reverse();
    }, [toasts]);

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
        >
            {orderedToasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${
                        toast.type === 'success'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                            : 'border-destructive/40 bg-destructive/10 text-destructive'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    ) : (
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    )}

                    <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>

                    <button
                        type="button"
                        onClick={() => removeToast(toast.id)}
                        className="inline-flex shrink-0 items-center justify-center rounded p-1 opacity-70 transition hover:opacity-100"
                        aria-label="Cerrar notificacion"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
