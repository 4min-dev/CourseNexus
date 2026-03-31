export type PaymentMethod = {
    token: string
    tab: string
    currency: string
    min: number
    name: string
    label: string
    logoClass: string
    logoText: string
    badgeClass: string
    badgeText: string
}

export const METHODS: PaymentMethod[] = [
    {
        token: "TRNSBPRUB",
        tab: "banks",
        currency: "RUB",
        min: 400,
        name: "Оплата из за границы",
        label: "от 400 ₽",
        logoClass: "bg-gradient-to-br from-pink-500 to-violet-600 text-white",
        logoText: "СБП",
        badgeClass: "bg-emerald-500/15 text-emerald-400",
        badgeText: "RUB ₽"
    },
    {
        token: "NSPK",
        tab: "banks",
        currency: "RUB",
        min: 400,
        name: "СБП QR",
        label: "от 400 ₽",
        logoClass: "bg-purple-600 text-white",
        logoText: "QR",
        badgeClass: "bg-emerald-500/15 text-emerald-400",
        badgeText: "RUB ₽"
    },
    {
        token: "INTERBRUB",
        tab: "banks",
        currency: "RUB",
        min: 400,
        name: "По карте (межбанк)",
        label: "от 400 ₽",
        logoClass: "bg-gray-700 text-white",
        logoText: "Card",
        badgeClass: "bg-emerald-500/15 text-emerald-400",
        badgeText: "RUB ₽"
    },
    {
        token: "SBPRUB",
        tab: "banks",
        currency: "RUB",
        min: 400,
        name: "СБП (Ру)",
        label: "от 400 ₽",
        logoClass: "bg-gradient-to-br from-pink-500 to-violet-600 text-white",
        logoText: "СБП",
        badgeClass: "bg-emerald-500/15 text-emerald-400",
        badgeText: "RUB ₽"
    },
    {
        token: "KASPKZT",
        tab: "banks",
        currency: "KZT",
        min: 6500,
        name: "Kaspi Bank",
        label: "от 6 500 ₸",
        logoClass: "bg-red-600 text-white",
        logoText: "Kaspi",
        badgeClass: "bg-blue-500/15 text-blue-400",
        badgeText: "KZT ₸"
    },
    {
        token: "INTERKZT",
        tab: "banks",
        currency: "KZT",
        min: 6500,
        name: "KZT Межбанк",
        label: "от 6 500 ₸",
        logoClass: "bg-gray-700 text-white",
        logoText: "Inter",
        badgeClass: "bg-blue-500/15 text-blue-400",
        badgeText: "KZT ₸"
    }
]

export const CURRENCY_SYMBOLS: Record<string, string> = {
    RUB: "₽",
    UZS: "сум",
    TRON: "USDT",
    KZT: "₸"
}

export const TABS = [
    { key: "all", label: "ВСЕ" },
    { key: "banks", label: "БАНКИ" },
    { key: "crypto", label: "🔥 КРИПТА" }
] as const

export const TIMER_SECONDS = 600
export const POLL_INTERVAL = 5000
export const POLL_MAX_ATTEMPTS = 180
export const TG_LINK = "https://t.me/kurs_helper"