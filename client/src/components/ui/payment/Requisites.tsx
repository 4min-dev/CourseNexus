import { Currency } from "@/lib/constants"

interface Props {
    amount: number
    currency: Currency
    onCopy: (text: string) => void
}

export default function Requisites({ amount, currency, onCopy }: Props) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Сумма для перевода</label>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-input px-4 py-3.5">
                        <span className="text-[15px] font-bold">{amount} {currency}</span>
                        <button onClick={() => onCopy(`${amount}`)} className="text-text-muted transition hover:text-accent-cyan">📋</button>
                    </div>
                </div>
                <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Телефон для перевода:</label>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-input px-4 py-3.5">
                        <span className="text-[15px] font-bold">+7XXXXXXXXXX</span>
                        <button onClick={() => onCopy("+7XXXXXXXXXX")} className="text-text-muted transition hover:text-accent-cyan">📋</button>
                    </div>
                </div>
            </div>
            <div>
                <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Банк и имя получателя</label>
                <div className="flex items-center gap-3.5 rounded-xl bg-bg-card px-5 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-base font-black text-gray-900">T</div>
                    <span className="text-[13px] font-extrabold uppercase tracking-wider">ТИНЬКОФФ БАНК</span>
                    <span className="ml-auto text-[13px] font-semibold text-text-secondary">—</span>
                </div>
            </div>
        </div>
    )
}
