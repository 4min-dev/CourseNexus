import { useState, useRef, useCallback, useEffect } from "react"
import { METHODS, TIMER_SECONDS, CURRENCY_SYMBOLS } from "@/lib/constants"
import type { PaymentMethod } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

export type ResultState = {
    status: string
    icon: string
    title: string
    text: string
}

const RESULT_MAP: Record<"SUCCESS" | "ERROR" | "TIMEOUT" | "CHECKING" | "PENDING", Omit<ResultState, "status">> = {
    SUCCESS: { icon: "✅", title: "Оплата прошла успешно!", text: "Средства зачислены на ваш баланс" },
    ERROR: { icon: "❌", title: "Ошибка оплаты", text: "Платёж не прошёл. Попробуйте снова или обратитесь в поддержку" },
    TIMEOUT: { icon: "⏳", title: "Время ожидания истекло", text: "Платёж не подтверждён за 10 минут. Создайте новую заявку" },
    CHECKING: { icon: "⏳", title: "Проверяем оплату...", text: "Ожидаем подтверждение от платёжной системы" },
    PENDING: { icon: "⏳", title: "Создаем заявку на пополнение баланса", text: "Ожидаем подтверждение от платёжной системы" }
}

type Currency = keyof typeof CURRENCY_SYMBOLS | "TRON"

export function usePayment() {
    const { toast } = useToast()

    const [tab, setTab] = useState("all")
    const [selected, setSelected] = useState<PaymentMethod>(METHODS[3])
    const [amount, setAmount] = useState(0)
    const [currency, setCurrency] = useState<Currency>("RUB")
    const [orderCreated, setOrderCreated] = useState(false)
    const [externalID, setExternalID] = useState<string | null>(null)
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [timer, setTimer] = useState(TIMER_SECONDS)
    const [toastState, setToast] = useState({ msg: "", visible: false })
    const [expiredOpen, setExpiredOpen] = useState(false)
    const [resultOpen, setResultOpen] = useState(false)
    const [resultState, setResultState] = useState<ResultState | null>(null)
    const [shaking, setShaking] = useState(false)

    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const pollRef = useRef<NodeJS.Timeout | null>(null)
    const pollAttempts = useRef(0)

    const showToast = useCallback((msg: string) => {
        setToast({ msg, visible: true })
        toast({ description: msg })
    }, [toast])

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (pollRef.current) clearInterval(pollRef.current)
    }, [])

    useEffect(() => () => clearTimers(), [clearTimers])

    const resetOrder = useCallback(() => {
        setOrderCreated(false)
        setExternalID(null)
        setPaymentUrl(null)
        clearTimers()
        setTimer(TIMER_SECONDS)
        pollAttempts.current = 0
    }, [clearTimers])

    const validationError = useCallback((): string | null => {
        if (currency !== selected.currency) return `Для ${selected.name} нужна валюта ${selected.currency}`
        if (amount > 0 && amount < selected.min) {
            const symbol = CURRENCY_SYMBOLS[selected.currency] || selected.currency
            return `Минимум: ${selected.min} ${symbol}`
        }
        return null
    }, [amount, currency, selected])

    const startTimer = useCallback(() => {
        setTimer(TIMER_SECONDS)
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!)
                    setExpiredOpen(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    const startPolling = useCallback((extId: string) => {
        pollAttempts.current = 0
        pollRef.current = setInterval(async () => {
            pollAttempts.current += 1

            try {
                const res = await fetch(`/api/payment/nirvana/status/${extId}`)
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || "Ошибка")

                if (data.mappedStatus === "success") {
                    clearTimers()
                    setResultState({ status: "SUCCESS", ...RESULT_MAP.SUCCESS })
                    setResultOpen(true)
                    resetOrder()
                    toast({ title: "Баланс пополнен!" })
                } else if (data.mappedStatus === "error") {
                    clearTimers()
                    setResultState({ status: "ERROR", ...RESULT_MAP.ERROR })
                    setResultOpen(true)
                }

                if (pollAttempts.current >= 120) {
                    clearTimers()
                    setResultState({ status: "TIMEOUT", ...RESULT_MAP.TIMEOUT })
                    setResultOpen(true)
                    showToast("Время ожидания истекло (10 мин)")
                }
            } catch (err) {
                console.error("Polling error", err)
            }
        }, 5000)
    }, [clearTimers, resetOrder, showToast, toast])

    const tryCreateOrder = useCallback(async (
        methodsToTry: PaymentMethod[],
        attemptIndex = 0
    ): Promise<{ success: boolean, paymentUrl?: string, externalId?: string, error?: string }> => {
        if (attemptIndex >= methodsToTry.length) {
            return { success: false, error: "Все доступные способы оплаты временно недоступны" }
        }

        const method = methodsToTry[attemptIndex]

        try {
            setLoading(true)
            showToast(`Пробуем ${method.name}...`)

            const res = await fetch("/api/payment/nirvana/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    currency,
                    tokenCode: method.token
                })
            })

            const data = await res.json()

            if (!res.ok) {
                console.warn(`[${method.name}]`, data.error || data.message || "Ошибка")
                return tryCreateOrder(methodsToTry, attemptIndex + 1)
            }

            const newPaymentUrl = data.paymentUrl
            setExternalID(data.externalId)
            setPaymentUrl(newPaymentUrl)
            setOrderCreated(true)
            setSelected(method)

            startTimer()
            startPolling(data.externalId)

            return { success: true, paymentUrl: newPaymentUrl, externalId: data.externalId }
        } catch (err) {
            console.error(`[${method.name}] exception`, err)
            return tryCreateOrder(methodsToTry, attemptIndex + 1)
        } finally {
            setLoading(false)
        }
    }, [amount, currency, startTimer, startPolling, showToast])

    const handleCreate = useCallback(async () => {
        const err = validationError()
        if (err) {
            showToast(err)
            if (err.includes("Минимум")) {
                setShaking(true)
                setTimeout(() => setShaking(false), 600)
            }
            return
        }

        const candidates = METHODS.filter(m => m.currency === currency)
        if (candidates.length === 0) {
            showToast("Нет доступных методов для этой валюты")
            return
        }

        const sorted = [
            ...candidates.filter(m => m.token === selected.token),
            ...candidates.filter(m => m.token !== selected.token)
        ]

        setResultState({ status: "PENDING", ...RESULT_MAP.PENDING })
        setLoading(true)

        const result = await tryCreateOrder(sorted)

        setLoading(false)

        if (result.success && result.paymentUrl) {
            showToast("Заявка создана! Оплатите по ссылке")

            const win = window.open(result.paymentUrl, "_blank")
            if (!win) {
                showToast("Разрешите всплывающие окна")
            }
        } else {
            showToast(result.error || "Не удалось создать платёж ни одним способом")
            setResultState({ status: "ERROR", ...RESULT_MAP.ERROR })
            setResultOpen(true)
        }
    }, [validationError, currency, selected.token, tryCreateOrder, showToast])

    const handleConfirm = useCallback(() => {
        if (!paymentUrl) return
        const win = window.open(paymentUrl, "_blank")
        if (!win) {
            showToast("Разрешите всплывающие окна")
        }
        setResultOpen(true)
    }, [paymentUrl])

    const selectMethod = (m: PaymentMethod) => {
        setSelected(m)
        setCurrency(m.currency as Currency)

        if (orderCreated) {
            resetOrder()
        }
    }

    const mainAction = () => {
        setResultState({ status: "PENDING", ...RESULT_MAP.PENDING })

        if (orderCreated) handleConfirm()
        else handleCreate()
    }

    const closeResult = () => {
        setResultOpen(false)
        clearTimers()
    }

    const getNewRequisites = () => {
        setExpiredOpen(false)
        resetOrder()
        setTimeout(handleCreate, 100)
    }

    const confirmFromExpired = () => {
        setExpiredOpen(false)
        handleConfirm()
    }

    return {
        tab, setTab,
        selected, selectMethod,
        amount, setAmount,
        currency, setCurrency,
        orderCreated, loading,
        timer, shaking,
        toast: toastState, showToast,
        expiredOpen, setExpiredOpen,
        resultOpen, resultState,
        validationError,
        mainAction,
        closeResult,
        getNewRequisites,
        confirmFromExpired,
        paymentUrl
    }
}