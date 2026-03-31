import { CURRENCY_SYMBOLS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import MethodsGrid from "@/components/ui/payment/MethodsGrid";
import AmountInput from "@/components/ui/payment/AmountInput";
import ActionBar from "@/components/ui/payment/ActionBar";
import Sidebar from "@/components/ui/payment/Sidebar";
import ExpiredModal from "@/components/ui/payment/ExpiredModal";
import { usePayment } from "@/hooks/usePayment";
import ResultModal from "@/components/ui/payment/ResultModal";
import { useLocation } from "wouter";
import { useEffect } from "react";


export default function PaymentPage() {
    const defaultAmount = new URLSearchParams(window.location.search).get('amount')
    const [, setLocation] = useLocation();
    const p = usePayment()

    const error = p.validationError()
    const hint = error ? `⚠ ${error}` : `Мин. сумма для ${p.selected.name}: ${p.selected.min.toLocaleString("ru-RU")} ${CURRENCY_SYMBOLS[p.selected.currency]}`

    useEffect(() => {
        if (defaultAmount) {
            p.setAmount(Number(defaultAmount))
        }
    }, [defaultAmount])

    return (
        <div className="flex min-h-screen items-start justify-center px-2 py-4 font-sans text-text-primary sm:px-4 sm:py-6 md:px-5 md:py-8">
            <div className="flex w-full max-w-[1080px] flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:gap-4">

                <div className="flex flex-col w-full max-w-[1080px] ">
                    <div className="min-w-0 flex-1 animate-fade-in-up overflow-hidden rounded-2xl border border-border bg-bg-secondary">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-5">
                            <h2 className="flex items-center gap-2 text-base font-extrabold sm:gap-2.5 sm:text-lg">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple text-sm">💰</span>
                                Пополнение баланса
                            </h2>
                            <button onClick={() => setLocation('/profile')} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition hover:bg-bg-card hover:text-text-primary">✕</button>
                        </div>

                        <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-4 md:space-y-5 md:px-6 md:py-5">
                            <MethodsGrid tab={p.tab} selected={p.selected} onTabChange={p.setTab} onSelect={p.selectMethod} />

                            <div className="rounded-xl bg-bg-card p-3 sm:p-5">
                                <h4 className="mb-3 text-xs font-extrabold uppercase tracking-widest">Как сделать депозит / пополнение</h4>
                                <ul className="space-y-1.5 text-[13px] text-text-secondary">
                                    <li className="relative pl-4 before:absolute before:left-0 before:font-black before:text-accent-cyan before:content-['•']">Перевести точную сумму по реквизитам одним переводом</li>
                                    <li className="relative pl-4 before:absolute before:left-0 before:font-black before:text-accent-cyan before:content-['•']">После перевода нажать кнопку <strong className="text-text-primary">Оплачено</strong></li>
                                </ul>
                            </div>

                            <AmountInput
                                amount={p.amount}
                                currency={p.currency}
                                hint={hint}
                                hintError={!!error}
                                shaking={p.shaking}
                                onAmountChange={p.setAmount}
                                onCurrencyChange={p.setCurrency}
                            />

                            <ActionBar orderCreated={p.orderCreated} loading={p.loading} timer={p.timer} onAction={p.mainAction} />

                        </div>

                    </div>

                    {
                        p?.paymentUrl && (
                            <div className="mt-[16px]">
                                <h4 className="mb-3 text-xs font-extrabold uppercase tracking-widest">Перейдите по ссылке для оплаты</h4>

                                <ul className="space-y-1.5 text-[13px] text-text-secondary">
                                    <li className="relative pl-4 before:absolute before:left-0 before:font-black before:text-accent-cyan before:content-['']">
                                        <a href={p?.paymentUrl}>

                                            {p?.paymentUrl}

                                        </a>
                                    </li>
                                </ul>
                            </div>
                        )
                    }
                </div>

                <Sidebar />

            </div>


            <ExpiredModal open={p.expiredOpen} onClose={() => p.setExpiredOpen(false)} onNewRequisites={p.getNewRequisites} onAlreadyPaid={p.confirmFromExpired} />
            <ResultModal open={p.resultOpen || p.loading} state={p.resultState} onClose={p.closeResult} />
        </div>
    )
}
