interface Props {
    orderCreated: boolean
    loading: boolean
    timer: number
    onAction: () => void
}

export default function ActionBar({ orderCreated, loading, timer, onAction }: Props) {
    const fmtTimer = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`

    return (
        <div className={`flex gap-2.5 ${orderCreated ? "flex-col sm:flex-row" : "flex-row"}`}>
            <button
                onClick={onAction}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-cyan-dark px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-bg-primary transition hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(62,230,196,0.3)] active:translate-y-0 disabled:opacity-50 sm:px-8 sm:py-4 sm:text-[15px]"
            >
                {loading ? (
                    <div className="h-5 w-5 animate-spin-slow rounded-full border-2 border-bg-primary border-t-transparent" />
                ) : (
                    <>
                        <span>{orderCreated ? "✓" : "🚀"}</span>
                        <span>{orderCreated ? "Перейти к оплате" : "Создать заявку"}</span>
                    </>
                )}
            </button>
            {orderCreated && (
                <div className="flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-border bg-bg-card px-5 py-3 text-sm font-bold text-text-secondary">
                    <span>⏱</span>
                    <span className="text-[11px]">ВРЕМЯ НА ОПЛАТУ:</span>
                    <span className="text-lg font-extrabold tabular-nums text-text-primary">{fmtTimer}</span>
                </div>
            )}
        </div>
    )
}
