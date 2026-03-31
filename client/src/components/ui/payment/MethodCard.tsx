interface Props {
    method: any
    active: boolean
    onSelect: () => void
}

export default function MethodCard({ method, active, onSelect }: Props) {
    return (
        <button
            onClick={onSelect}
            className={`flex flex-col items-start gap-2 rounded-xl border-2 p-3.5 text-left transition-all duration-200 ${active
                ? "border-accent-cyan bg-bg-card-hover shadow-[0_0_20px_rgba(62,230,196,0.15)]"
                : "border-transparent bg-bg-card hover:-translate-y-0.5 hover:border-border hover:bg-bg-card-hover"
                }`}
        >
            <div className="flex w-full items-center justify-between">
                <div className={`flex h-6 w-9 items-center justify-center rounded text-[9px] font-black ${method.logoClass}`}>
                    {method.logoText}
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${method.badgeClass}`}>
                    {method.badgeText}
                </span>
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider">{method.name}</div>
            <div className="text-[10px] font-semibold text-text-secondary">{method.label}</div>
        </button>
    )
}
