import { METHODS, PaymentMethod, TABS } from "@/lib/constants"
import MethodCard from "./MethodCard"

interface Props {
    tab: string
    selected: PaymentMethod
    onTabChange: (tab: string) => void
    onSelect: (m: PaymentMethod) => void
}

export default function MethodsGrid({ tab, selected, onTabChange, onSelect }: Props) {
    const filtered = tab === "all" ? METHODS : METHODS.filter((m: any) => m.tab === tab)

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {TABS.map((t: any) => (
                    <button
                        key={t.key}
                        onClick={() => onTabChange(t.key)}
                        className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${tab === t.key
                            ? "bg-accent-cyan text-bg-primary"
                            : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {filtered.map((m: any) => (
                    <MethodCard key={m.token} method={m} active={selected.token === m.token} onSelect={() => onSelect(m)} />
                ))}
            </div>
        </>
    )
}
