import { Currency } from "@/lib/constants"

interface Props {
    amount: number
    currency: Currency
    hint: string
    hintError: boolean
    shaking: boolean
    onAmountChange: (v: number) => void
    onCurrencyChange: (v: Currency) => void
}

export default function AmountInput({
    amount,
    currency,
    hint,
    hintError,
    shaking,
    onAmountChange,
    onCurrencyChange,
}: Props) {
    const displayValue = amount === 0 ? "" : amount.toString()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, "")
        const num = raw === "" ? 0 : Number(raw)
        onAmountChange(num)
    }

    return (
        <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">
                Сумма для перевода
            </label>

            <div className="flex gap-2.5">
                <div
                    className={`flex flex-1 items-center rounded-xl border bg-bg-input px-4 py-3.5 transition ${hintError ? "border-red-500" : "border-border focus-within:border-accent-cyan"
                        } ${shaking ? "animate-shake" : ""}`}
                >
                    <input
                        type="text"
                        inputMode="numeric"
                        value={displayValue}
                        onChange={handleChange}
                        placeholder="Введите сумму"
                        className="w-full bg-transparent text-[15px] font-bold text-text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            </div>

            <p className={`mt-2 text-[11px] font-semibold ${hintError ? "text-red-500" : "text-text-muted"}`}>
                {hint}
            </p>
        </div>
    )
}