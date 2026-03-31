import { useState } from "react"
import { TG_LINK } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

function TgIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    )
}

export default function Sidebar() {
    const { toast } = useToast()
    const [promo, setPromo] = useState("")

    const applyPromo = () => {
        if (!promo.trim()) return toast({ title: "⚠ Введите промо-код" })
        toast({ title: `Промо-код «${promo.trim()}» не найден` })
    }

    return (
        <aside className="flex w-full shrink-0 flex-col gap-3 md:w-[280px]">
            <div className="animate-fade-in-up rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                <h3 className="mb-1.5 text-base font-black">Пополнение через администратора</h3>
                <p className="mb-4 text-xs leading-relaxed text-text-secondary">
                    Для быстрого пополнения баланса <strong className="font-black text-accent-cyan">без комиссии</strong> напишите администратору в Телеграмм по кнопке ниже
                </p>
                <a href={TG_LINK} target="_blank" rel="noreferrer" className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] py-3 pl-11 pr-4 text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(42,171,238,0.35)]">
                    <TgIcon className="absolute left-3.5 h-[22px] w-[22px]" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Пополнить через администратора</span>
                </a>
            </div>

            <div className="animate-fade-in-up rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                <h4 className="mb-3.5 text-center text-xs font-extrabold uppercase tracking-widest text-text-secondary">Промо-код к депозиту</h4>
                <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border border-border bg-bg-input px-4 py-3 transition focus-within:border-accent-cyan">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-purple text-xs">🎁</div>
                    <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Введите код" className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted" />
                </div>
                <button onClick={applyPromo} className="w-full rounded-xl bg-gradient-to-br from-accent-cyan to-accent-cyan-dark px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-bg-primary transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,230,196,0.3)]">
                    Применить
                </button>
            </div>

            <div className="animate-fade-in-up rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
                <h3 className="mb-1.5 text-base font-black">Нужна помощь?</h3>
                <p className="mb-4 text-xs leading-relaxed text-text-secondary">
                    Возникла ошибка или не знаешь как оплатить? Напиши в техподдержку — поможем решить любую проблему или разобраться с функционалом
                </p>
                <a href={TG_LINK} target="_blank" rel="noreferrer" className="relative flex w-full items-center justify-center rounded-xl border border-border bg-bg-card py-3 pl-11 pr-4 text-text-primary transition hover:-translate-y-0.5 hover:border-accent-cyan hover:text-accent-cyan hover:shadow-[0_0_20px_rgba(62,230,196,0.15)]">
                    <TgIcon className="absolute left-3.5 h-5 w-5" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Написать в техподдержку</span>
                </a>
            </div>
        </aside>
    )
}
