import { Eraser, PenLine } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    className?: string;
};

type SignaturePoint = {
    x: number;
    y: number;
};

type SignaturePath = SignaturePoint[];

const CANVAS_HEIGHT = 220;
const STROKE_WIDTH = 2.4;

export default function OrderSignaturePad({
    value,
    onChange,
    error,
    className,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pathsRef = useRef<SignaturePath[]>([]);
    const activePathRef = useRef<SignaturePath | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const hasSignature = useMemo(() => value.trim().length > 0, [value]);

    const strokeColor = useMemo(() => {
        return isDarkMode ? '#e2e8f0' : '#0f172a';
    }, [isDarkMode]);

    const drawPath = useCallback(
        (context: CanvasRenderingContext2D, path: SignaturePath) => {
            if (path.length === 0) {
                return;
            }

            context.beginPath();
            context.strokeStyle = strokeColor;
            context.lineWidth = STROKE_WIDTH;
            context.lineCap = 'round';
            context.lineJoin = 'round';

            if (path.length === 1) {
                const point = path[0];

                context.moveTo(point.x, point.y);
                context.lineTo(point.x + 0.1, point.y + 0.1);
                context.stroke();

                return;
            }

            context.moveTo(path[0].x, path[0].y);

            for (let index = 1; index < path.length; index += 1) {
                context.lineTo(path[index].x, path[index].y);
            }

            context.stroke();
        },
        [strokeColor],
    );

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();
        const targetWidth = Math.max(320, Math.floor(rect.width));

        canvas.width = Math.floor(targetWidth * ratio);
        canvas.height = Math.floor(CANVAS_HEIGHT * ratio);

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        context.clearRect(0, 0, targetWidth, CANVAS_HEIGHT);
        context.scale(ratio, ratio);
        pathsRef.current.forEach((path) => {
            drawPath(context, path);
        });
    }, [drawPath]);

    useEffect(() => {
        resizeCanvas();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [resizeCanvas]);

    useEffect(() => {
        const root = document.documentElement;

        const updateTheme = () => {
            setIsDarkMode(root.classList.contains('dark'));
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!hasSignature || pathsRef.current.length === 0) {
            return;
        }

        resizeCanvas();

        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        onChange(canvas.toDataURL('image/png'));
    }, [hasSignature, isDarkMode, onChange, resizeCanvas]);

    useEffect(() => {
        if (value !== '') {
            return;
        }

        pathsRef.current = [];
        activePathRef.current = null;
        resizeCanvas();
    }, [resizeCanvas, value]);

    const getCoordinates = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;

        if (canvas === null) {
            return { x: 0, y: 0 };
        }

        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const beginDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);

        const { x, y } = getCoordinates(event);
        const newPath: SignaturePath = [{ x, y }];

        pathsRef.current.push(newPath);
        activePathRef.current = newPath;

        drawPath(context, newPath);
        setIsDrawing(true);
    };

    const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }

        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        event.preventDefault();

        const { x, y } = getCoordinates(event);
        const activePath = activePathRef.current;

        if (activePath === null || activePath.length === 0) {
            return;
        }

        activePath.push({ x, y });
        drawPath(context, activePath);
    };

    const finishDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }

        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        event.preventDefault();
        canvas.releasePointerCapture(event.pointerId);

        setIsDrawing(false);
        activePathRef.current = null;

        const dataUrl = canvas.toDataURL('image/png');
        onChange(dataUrl);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;

        if (canvas === null) {
            return;
        }

        const context = canvas.getContext('2d');

        if (context === null) {
            return;
        }

        const rect = canvas.getBoundingClientRect();

        pathsRef.current = [];
        activePathRef.current = null;
        context.clearRect(0, 0, rect.width, CANVAS_HEIGHT);
        onChange('');
    };

    return (
        <div className={cn('space-y-2', className)}>
            <label className="text-sm font-medium">Firma del cliente</label>

            <div className="rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                <canvas
                    ref={canvasRef}
                    className="h-55 w-full touch-none rounded-md bg-slate-50 dark:bg-slate-900"
                    onPointerDown={beginDraw}
                    onPointerMove={draw}
                    onPointerUp={finishDraw}
                    onPointerLeave={finishDraw}
                    onPointerCancel={finishDraw}
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                    El cliente puede firmar con mouse, dedo o lapiz tactil.
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                >
                    <Eraser className="size-4" />
                    Limpiar firma
                </Button>
            </div>

            {!hasSignature && (
                <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
                    <PenLine className="size-4" />
                    La firma es obligatoria para crear el pedido.
                </div>
            )}

            <InputError message={error} />
        </div>
    );
}
