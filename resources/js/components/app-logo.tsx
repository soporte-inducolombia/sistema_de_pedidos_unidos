export default function AppLogo() {
    return (
        <>
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-sm">
                <img
                    src="/logo_unidos.png"
                    alt="Logo UNIDOS"
                    className="h-full w-full object-contain"
                />
            </div>
            <div className="ml-2 min-w-0 leading-tight">
                <span className="block text-xs font-medium text-foreground/80">
                    Sistema de pedidos
                </span>
                <span className="block text-sm font-semibold tracking-tight text-foreground">
                    UNIDOS
                </span>
            </div>
        </>
    );
}
