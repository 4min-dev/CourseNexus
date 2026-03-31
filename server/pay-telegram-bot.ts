import 'dotenv/config'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import ExcelJS from 'exceljs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import { pgTable, serial, bigint, varchar, timestamp, text, numeric } from 'drizzle-orm/pg-core'
import { getUpdates, sendTelegramMessage, answerCallbackQuery } from './telegram-pay'
import type { TelegramUpdate, TelegramMessage, TelegramCallbackQuery } from './telegram-pay'

console.log('ЗАПУСК pay-telegram-bot.ts — строка 1')

const PAY_BOT_TOKEN = process.env.PAY_TELEGRAM_BOT_TOKEN

if (!PAY_BOT_TOKEN) {
    console.error('[PayBot] PAY_TELEGRAM_BOT_TOKEN не найден')
    process.exit(1)
}

const NIRVANA_GLOBAL_PUBLIC = process.env.NIRVANA_GLOBAL_PUBLIC || ''
const NIRVANA_GLOBAL_PRIVATE = process.env.NIRVANA_GLOBAL_PRIVATE || ''
const NIRVANA_KZ_PUBLIC = process.env.NIRVANA_KZ_PUBLIC || ''
const NIRVANA_KZ_PRIVATE = process.env.NIRVANA_KZ_PRIVATE || ''

const BOT_USERNAME = process.env.PAY_BOT_USERNAME || 'aaswaeoi992_bot'

if (!NIRVANA_GLOBAL_PUBLIC || !NIRVANA_GLOBAL_PRIVATE ||
    !NIRVANA_KZ_PUBLIC || !NIRVANA_KZ_PRIVATE) {
    console.error('[Payment Bot] NirvanaPay ключи не найдены в .env')
    process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

const telegramUsers = pgTable('telegram_users', {
    id: serial('id').primaryKey(),
    telegramId: bigint('telegram_id', { mode: 'number' }).unique().notNull(),
    firstName: varchar('first_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    username: varchar('username', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
})

const telegramReferrals = pgTable('telegram_referrals', {
    id: serial('id').primaryKey(),
    referrerId: bigint('referrer_id', { mode: 'number' }).references(() => telegramUsers.telegramId),
    referredId: bigint('referred_id', { mode: 'number' }).references(() => telegramUsers.telegramId),
    createdAt: timestamp('created_at').defaultNow()
})

const telegramPayments = pgTable('telegram_payments', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).references(() => telegramUsers.telegramId),
    amount: numeric('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).unique().notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    refAdminId: bigint('ref_admin_id', { mode: 'number' }).references(() => telegramUsers.telegramId)
})

async function initDbTables() {
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS telegram_users (
                id SERIAL PRIMARY KEY,
                telegram_id BIGINT UNIQUE NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                username VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS telegram_referrals (
                id SERIAL PRIMARY KEY,
                referrer_id BIGINT REFERENCES telegram_users(telegram_id),
                referred_id BIGINT REFERENCES telegram_users(telegram_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS telegram_payments (
                id SERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES telegram_users(telegram_id),
                amount NUMERIC NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(20) NOT NULL,
                external_id VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ref_admin_id BIGINT REFERENCES telegram_users(telegram_id)
            )
        `)

        console.log('[DB] Таблицы telegram_* созданы/проверены')
    } catch (err) {
        console.error('[DB] Ошибка инициализации таблиц:', err)
    }
}

const MAIN_ADMIN_IDS = new Set<number>([
    531025167,
    7076111140,
    5724969311,
    5252948559,
    5557417901
])

const ADMIN_IDS = new Set([...MAIN_ADMIN_IDS])

const ADMIN_NAMES: Record<number, string> = {
    531025167: 'Никита',
    7076111140: 'Максим',
    5724969311: 'Техник',
    5252948559: 'Кирилл 1',
    5557417901: 'Николай',
    5531387955: 'Владислав',
    6410350311: 'Вадим'
}

console.log('[Payment Bot] Конфиг загружен')

interface PaymentMethod {
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

const METHODS: PaymentMethod[] = [
    { token: "TRNSBPRUB", tab: "banks", currency: "RUB", min: 400, name: "Оплата из за границы", label: "от 400 ₽", logoClass: "bg-gradient-to-br from-pink-500 to-violet-600 text-white", logoText: "СБП", badgeClass: "bg-emerald-500/15 text-emerald-400", badgeText: "RUB ₽" },
    { token: "NSPK", tab: "banks", currency: "RUB", min: 400, name: "СБП QR", label: "от 400 ₽", logoClass: "bg-purple-600 text-white", logoText: "QR", badgeClass: "bg-emerald-500/15 text-emerald-400", badgeText: "RUB ₽" },
    { token: "INTERBRUB", tab: "banks", currency: "RUB", min: 400, name: "По карте (межбанк)", label: "от 400 ₽", logoClass: "bg-gray-700 text-white", logoText: "Card", badgeClass: "bg-emerald-500/15 text-emerald-400", badgeText: "RUB ₽" },
    { token: "SBPRUB", tab: "banks", currency: "RUB", min: 400, name: "СБП (Ру)", label: "от 400 ₽", logoClass: "bg-gradient-to-br from-pink-500 to-violet-600 text-white", logoText: "СБП", badgeClass: "bg-emerald-500/15 text-emerald-400", badgeText: "RUB ₽" },
    { token: "KASPKZT", tab: "banks", currency: "KZT", min: 6500, name: "Kaspi Bank", label: "от 6 500 ₸", logoClass: "bg-red-600 text-white", logoText: "Kaspi", badgeClass: "bg-blue-500/15 text-blue-400", badgeText: "KZT ₸" },
    { token: "INTERKZT", tab: "banks", currency: "KZT", min: 6500, name: "KZT Межбанк", label: "от 6 500 ₸", logoClass: "bg-gray-700 text-white", logoText: "Inter", badgeClass: "bg-blue-500/15 text-blue-400", badgeText: "KZT ₸" }
]

const MIN_AMOUNT = Math.min(...METHODS.map(m => m.min))

interface UserRef {
    userId: number
    refAdmin: number | null
    createdAt: Date
}

interface StoredUser {
    userId: number
    firstName: string
    lastName?: string
    username?: string
    updatedAt: Date
}

interface PaymentSession {
    userId: number
    chatId: number
    amount: number
    externalId: string
    selectedMethodToken?: string
    createdAt: Date
    status: 'waiting_amount' | 'waiting_method' | 'waiting_payment' | 'done' | 'failed'
}

interface Transaction {
    id?: number
    userId: number
    amount: number
    currency: string
    status: 'pending' | 'completed' | 'failed'
    externalId: string
    description: string
    createdAt: Date
    adminId: number | null
    updatedAt?: Date
}

let withdrawableSum = 0
let withdrawableSumKZT = 0

const usersRef = new Map<number, UserRef>()
const storedUsers = new Map<number, StoredUser>()
const sessions = new Map<number, PaymentSession>()
const transactions = new Map<string, Transaction>()

const TEMP_DIR = path.join(__dirname, '../temp')
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => { })

setInterval(() => {
    const now = Date.now()
    for (const [chatId, session] of sessions.entries()) {
        if (now - session.createdAt.getTime() > 30 * 60 * 1000) {
            sessions.delete(chatId)
            console.log(`[Cleanup] Удалена сессия chatId=${chatId}`)
            sendTelegramMessage(chatId, 'Сессия истекла (30 мин). Введите /start')
        }
    }
}, 60 * 1000)

function generateExternalId(userId: number): string {
    return `topup_${userId}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`
}

async function getAvailableTokens(): Promise<{ code: string, name: string, currency: string }[]> {
    try {
        const resp = await axios.get('https://f.nirvanapay.pro/api/v2/tokens', {
            headers: {
                ApiPublic: NIRVANA_GLOBAL_PUBLIC,
                ApiPrivate: NIRVANA_GLOBAL_PRIVATE,
                Accept: 'application/json'
            },
            timeout: 10000
        })
        return resp.data?.data || []
    } catch (err: any) {
        console.error('[Nirvana Tokens] Ошибка:', err.message)
        return []
    }
}

async function createNirvanaOrder(
    amount: number,
    externalId: string,
    userId: number,
    tokenCode?: string,
    currency: string = 'RUB'
): Promise<string | null> {
    const isKZT = currency.toUpperCase() === 'KZT'
    const publicKey = isKZT ? NIRVANA_KZ_PUBLIC : NIRVANA_GLOBAL_PUBLIC
    const privateKey = isKZT ? NIRVANA_KZ_PRIVATE : NIRVANA_GLOBAL_PRIVATE

    const payload: any = {
        amount,
        currency,
        externalID: externalId,
        redirectURL: `https://t.me/${BOT_USERNAME}`,
        siteName: 'В курсе?',
        callbackURL: 'https://go.vkurse.io/api/payment/nirvana/dummy-callback',
        userInfo: {
            id: String(userId),
            ip: '127.0.0.1',
            userAgent: 'Telegram Bot Payment',
            email: ''
        }
    }

    if (tokenCode) payload.tokenCode = tokenCode

    try {
        const resp = await axios.post('https://f.nirvanapay.pro/api/v2/order', payload, {
            headers: {
                ApiPublic: publicKey,
                ApiPrivate: privateKey,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            timeout: 15000
        })
        return resp.data?.data?.redirectURL || null
    } catch (err: any) {
        console.error('[Nirvana Create] Ошибка:', {
            externalId,
            amount,
            token: tokenCode || 'auto',
            currency,
            response: err.response?.data || err.message
        })
        return null
    }
}

async function checkOrderStatus(externalId: string, currency: string = 'RUB') {
    const isKZT = currency.toUpperCase() === 'KZT'
    const publicKey = isKZT ? NIRVANA_KZ_PUBLIC : NIRVANA_GLOBAL_PUBLIC
    const privateKey = isKZT ? NIRVANA_KZ_PRIVATE : NIRVANA_GLOBAL_PRIVATE

    try {
        const resp = await axios.get(`https://f.nirvanapay.pro/api/v2/order?externalId=${externalId}`, {
            headers: {
                ApiPublic: publicKey,
                ApiPrivate: privateKey,
                Accept: 'application/json'
            },
            timeout: 10000
        })
        return resp.data?.data || null
    } catch (err: any) {
        console.error('[Nirvana Status]', err.message)
        return null
    }
}

async function sendDocument(
    chatId: number,
    filePath: string,
    options: { caption?: string, filename?: string } = {}
) {
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('document', fsSync.createReadStream(filePath), {
        filename: options.filename || path.basename(filePath),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    if (options.caption) form.append('caption', options.caption)

    const res = await axios.post(
        `https://api.telegram.org/bot${PAY_BOT_TOKEN}/sendDocument`,
        form,
        { headers: form.getHeaders() }
    )

    return res.data
}

function getAdminKeyboard(isMainAdmin: boolean) {
    const common = [
        [{ text: "📊 Статистика / Экспорт" }],
        [{ text: "🔗 Моя реф. ссылка" }],
        [{ text: "Создать тестовую оплату" }],
        [{ text: "❌ Скрыть меню" }]
    ]

    if (isMainAdmin) {
        return {
            keyboard: [
                ...common,
                [{ text: "➕ Добавить 5 фейк-транзакций" }],
                [{ text: "🔄 Сброс суммы вывода" }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    }

    return {
        keyboard: common,
        resize_keyboard: true,
        one_time_keyboard: false
    }
}

async function setupBotMenuAndCommands() {
    try {
        await axios.post(`https://api.telegram.org/bot${PAY_BOT_TOKEN}/setMyCommands`, {
            commands: [
                { command: "start", description: "Начать оплату" },
                { command: "history", description: "Статистика и экспорт" },
                { command: "createpay", description: "Создать тестовую ссылку" },
                { command: "myref", description: "Моя реферальная ссылка" },
            ],
            scope: { type: "all_private_chats" }
        })

        console.log('[BotMenu] Глобальные команды настроены')
    } catch (err: any) {
        console.error('[BotMenu] Ошибка настройки:', err.response?.data || err.message)
    }
}

let offset: number | undefined = undefined
let isRunning = true

async function processUpdate(update: TelegramUpdate) {
    if (update.callback_query) {
        await handleCallbackQuery(update.callback_query)
        return
    }
    if (update.message) {
        await handleMessage(update.message)
    }
}

async function handleMessage(msg: TelegramMessage) {
    const chatId = msg.chat.id
    const userId = msg.from.id
    const text = msg.text?.trim()

    if (msg.from) {
        await db
            .insert(telegramUsers)
            .values({
                telegramId: userId,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name ?? null,
                username: msg.from.username ?? null
            })
            .onConflictDoUpdate({
                target: telegramUsers.telegramId,
                set: {
                    firstName: msg.from.first_name,
                    lastName: msg.from.last_name ?? null,
                    username: msg.from.username ?? null,
                    updatedAt: sql`CURRENT_TIMESTAMP`
                }
            })

        storedUsers.set(userId, {
            userId,
            firstName: msg.from.first_name,
            lastName: msg.from.last_name ?? undefined,
            username: msg.from.username ?? undefined,
            updatedAt: new Date()
        })
    }

    if (!text) return

    console.log(`[Msg] ${userId} → ${text}`)

    const isAdmin = ADMIN_IDS.has(userId)
    const isMainAdmin = MAIN_ADMIN_IDS.has(userId)

    if ((text === '/menu' || text.startsWith('/start')) && isAdmin) {
        await sendTelegramMessage(chatId, 'Админ-панель:', {
            reply_markup: getAdminKeyboard(isMainAdmin)
        })
    }

    if (text === '📊 Статистика / Экспорт' || text.startsWith('/history')) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const todayCompleted = Array.from(transactions.values()).filter(
            tx => tx.createdAt >= todayStart && tx.status === 'completed'
        )

        const allTimeCompleted = Array.from(transactions.values()).filter(
            tx => tx.status === 'completed'
        )

        let msgText = '📊 Статистика пополнений\n\n'

        let totalTodayRUB = 0
        let totalAllTimeRUB = 0
        let totalTodayKZT = 0
        let totalAllTimeKZT = 0

        todayCompleted.forEach(tx => {
            if (tx.currency === 'RUB') totalTodayRUB += tx.amount
            if (tx.currency === 'KZT') totalTodayKZT += tx.amount
        })

        allTimeCompleted.forEach(tx => {
            if (tx.currency === 'RUB') totalAllTimeRUB += tx.amount
            if (tx.currency === 'KZT') totalAllTimeKZT += tx.amount
        })

        if (isMainAdmin) {
            msgText += `RUB за сегодня: ${totalTodayRUB} ₽\n`
            msgText += `KZT за сегодня: ${totalTodayKZT} ₸\n\n`
            msgText += `RUB за всё время: ${totalAllTimeRUB} ₽\n`
            msgText += `KZT за всё время: ${totalAllTimeKZT} ₸\n`
            msgText += `Сумма к выводу (RUB): ${withdrawableSum} ₽\n`
            msgText += `Сумма к выводу (KZT): ${withdrawableSumKZT} ₸\n`
        } else {
            const myTodayRUB = todayCompleted
                .filter(tx => (tx.adminId || tx.userId) === userId && tx.currency === 'RUB')
                .reduce((s, tx) => s + tx.amount, 0)

            const myTodayKZT = todayCompleted
                .filter(tx => (tx.adminId || tx.userId) === userId && tx.currency === 'KZT')
                .reduce((s, tx) => s + tx.amount, 0)

            msgText += `RUB ваших клиентов за сегодня: ${myTodayRUB} ₽\n`
            msgText += `KZT ваших клиентов за сегодня: ${myTodayKZT} ₸\n`
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '📥 Все', callback_data: 'export_all' }],
                [{ text: '✅ Успешные', callback_data: 'export_completed' }],
                [{ text: '❌ Неуспешные', callback_data: 'export_failed' }],
                [{ text: '⏳ В ожидании', callback_data: 'export_pending' }]
            ]
        }

        if (isMainAdmin) {
            keyboard.inline_keyboard.push([{ text: '🔄 Сброс суммы для вывода', callback_data: 'reset_withdrawable' }])
        }

        await sendTelegramMessage(chatId, msgText, keyboard)
        return
    }

    if (text === '🔗 Моя реф. ссылка' || text === '/myref') {
        const refLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`
        await sendTelegramMessage(chatId, `Реф. ссылка:\n\n${refLink}`)
        return
    }

    if (text === 'Создать тестовую оплату' || text.startsWith('/createpay')) {
        const parts = text.split(/\s+/)
        let amount = 1000

        if (parts.length > 1) {
            const num = Number(parts[1].replace(/[^0-9]/g, ''))
            if (!isNaN(num) && num >= 100) amount = num
            else {
                await sendTelegramMessage(chatId, `Минимальная сумма: 100`)
                return
            }
        }

        await sendTelegramMessage(chatId, `Создаю платёж на ${amount}... Запрашиваю методы`)

        const tokens = await getAvailableTokens()
        if (tokens.length === 0) {
            await sendTelegramMessage(chatId, 'Не удалось получить список методов')
            return
        }

        let successUrl: string | null = null
        let successToken = ''
        let successCurrency = ''
        let lastError = ''

        for (const t of tokens) {
            const extId = generateExternalId(userId)
            const url = await createNirvanaOrder(amount, extId, userId, t.code, t.currency)

            if (url) {
                successUrl = url
                successToken = t.name || t.code
                successCurrency = t.currency
                break
            } else {
                lastError = `Метод ${t.name || t.code} (${t.currency}) не прошёл`
            }
        }

        if (successUrl) {
            await sendTelegramMessage(chatId,
                `✅ Ссылка создана!\n\nСумма: ${amount} ${successCurrency}\nМетод: ${successToken}\n\n${successUrl}`
            )
        } else {
            await sendTelegramMessage(chatId,
                `❌ Не удалось создать платёж.\nПоследняя попытка: ${lastError || 'ошибка'}`
            )
        }
        return
    }

    if (text === '❌ Скрыть меню') {
        await sendTelegramMessage(chatId, 'Меню скрыто', {
            reply_markup: { remove_keyboard: true }
        })
        return
    }

    if (isMainAdmin) {
        if (text === '🔄 Сброс суммы для вывода') {
            withdrawableSum = 0
            withdrawableSumKZT = 0
            await sendTelegramMessage(chatId, 'Суммы для вывода (RUB и KZT) сброшены до 0')
            return
        }
    }

    if (text.startsWith('/userinfo') && isAdmin) {
        let targetUserId: number | null = null
        let searchQuery = text.replace('/userinfo', '').trim()

        if (!searchQuery) {
            targetUserId = userId
        } else if (searchQuery.startsWith('@')) {
            const targetUsername = searchQuery.slice(1).toLowerCase()
            for (const [id, u] of storedUsers.entries()) {
                if (u.username?.toLowerCase() === targetUsername) {
                    targetUserId = id
                    break
                }
            }
            if (!targetUserId) {
                await sendTelegramMessage(chatId, `Пользователь @${targetUsername} не найден.`)
                return
            }
        } else {
            const parsed = Number(searchQuery)
            if (!isNaN(parsed) && storedUsers.has(parsed)) {
                targetUserId = parsed
            }
        }

        if (!targetUserId) {
            await sendTelegramMessage(chatId,
                'Использование:\n' +
                '/userinfo — о себе\n' +
                '/userinfo 123456789 — по ID\n' +
                '/userinfo @username — по username'
            )
            return
        }

        const u = storedUsers.get(targetUserId)!

        const nameParts = [u.firstName]
        if (u.lastName) nameParts.push(u.lastName)
        const fullName = nameParts.join(' ')

        let displayLine = u.username
            ? `@${u.username} (${fullName})`
            : `${fullName} (без username)`

        let msg = `👤 Информация о пользователе\n\n` +
            `ID: ${targetUserId}\n` +
            `Имя: ${displayLine}\n`

        if (u.username) msg += `Username: @${u.username}\n`

        msg += `Последнее обновление: ${u.updatedAt.toISOString().slice(0, 19).replace('T', ' ')}\n`

        const txCount = Array.from(transactions.values())
            .filter(tx => tx.userId === targetUserId)
            .length

        if (txCount > 0) msg += `Транзакций: ${txCount}\n`

        await sendTelegramMessage(chatId, msg)
        return
    }

    if (text.startsWith('/start')) {
        let refAdmin: number | null = null
        const args = text.split(/\s+/)

        if (args.length > 1 && args[1].startsWith('ref_')) {
            const id = Number(args[1].slice(4))
            if (!isNaN(id) && ADMIN_IDS.has(id)) {
                refAdmin = id
                await db.insert(telegramReferrals).values({
                    referrerId: refAdmin,
                    referredId: userId
                }).onConflictDoNothing()

                usersRef.set(userId, { userId, refAdmin, createdAt: new Date() })
            }
        }

        sessions.set(chatId, {
            userId,
            chatId,
            amount: 0,
            externalId: '',
            createdAt: new Date(),
            status: 'waiting_amount'
        })

        await sendTelegramMessage(chatId,
            `Введите сумму пополнения (в цифрах)\n\n` +
            `Минимальные суммы:\n` +
            `• RUB — от ${MIN_AMOUNT} ₽\n` +
            `• KZT — от 6500 ₸\n\n` +
            `Доступные валюты: RUB и KZT`
        )

        if (isAdmin) {
            await sendTelegramMessage(chatId, 'Админ-панель доступна', {
                reply_markup: getAdminKeyboard(isMainAdmin)
            })
        }

        return
    }

    const session = sessions.get(chatId)
    if (!session) return

    if (session.status === 'waiting_amount') {
        const cleaned = text.replace(/[^0-9]/g, '')
        const amount = Number(cleaned)

        if (isNaN(amount) || amount < MIN_AMOUNT || amount > 500000) {
            await sendTelegramMessage(chatId, `Введите корректную сумму от ${MIN_AMOUNT} до 500000`)
            return
        }

        session.amount = amount
        session.status = 'waiting_method'

        const avail = METHODS.filter(m => amount >= m.min)

        if (avail.length === 0) {
            await sendTelegramMessage(chatId, `Для суммы ${amount} ₽ нет доступных методов`)
            sessions.delete(chatId)
            return
        }

        const sortedAvail = [
            ...avail.filter(m => m.currency === 'RUB'),
            ...avail.filter(m => m.currency === 'KZT')
        ]

        const rubMethods = sortedAvail.filter(m => m.currency === 'RUB')
        const kztMethods = sortedAvail.filter(m => m.currency === 'KZT')

        const keyboardRows: any[] = []

        if (rubMethods.length > 0) {
            keyboardRows.push(...rubMethods.map(m => [{
                text: `${m.name} ${m.label} (${m.currency})`,
                callback_data: `pay:${m.token}`
            }]))
        }

        if (kztMethods.length > 0) {
            if (rubMethods.length > 0) {
                keyboardRows.push([{ text: "──────── KZT методы ────────", callback_data: "dummy" }])
            }
            keyboardRows.push(...kztMethods.map(m => [{
                text: `${m.name} ${m.label} (${m.currency})`,
                callback_data: `pay:${m.token}`
            }]))
        }

        await sendTelegramMessage(chatId,
            `Сумма: ${amount} ₽\n` +
            `Доступно методов: ${avail.length} (RUB: ${rubMethods.length}, KZT: ${kztMethods.length})\n\n` +
            `Выберите способ оплаты:`,
            { inline_keyboard: keyboardRows }
        )

        return
    }
}

async function handleCallbackQuery(cb: TelegramCallbackQuery) {
    const chatId = cb.message?.chat.id
    const userId = cb.from.id
    const data = cb.data

    if (cb.from) {
        await db
            .insert(telegramUsers)
            .values({
                telegramId: userId,
                firstName: cb.from.first_name,
                lastName: cb.from.last_name ?? null,
                username: cb.from.username ?? null
            })
            .onConflictDoUpdate({
                target: telegramUsers.telegramId,
                set: {
                    firstName: cb.from.first_name,
                    lastName: cb.from.last_name ?? null,
                    username: cb.from.username ?? null,
                    updatedAt: sql`CURRENT_TIMESTAMP`
                }
            })

        storedUsers.set(userId, {
            userId,
            firstName: cb.from.first_name,
            lastName: cb.from.last_name ?? undefined,
            username: cb.from.username ?? undefined,
            updatedAt: new Date()
        })
    }

    if (!chatId || !data) return
    await answerCallbackQuery(cb.id)

    let session = sessions.get(chatId)

    if (!session) {
        session = {
            userId,
            chatId,
            amount: 0,
            externalId: '',
            createdAt: new Date(),
            status: 'waiting_amount'
        }
        sessions.set(chatId, session)
    }

    if (data === 'reset_withdrawable' && MAIN_ADMIN_IDS.has(userId)) {
        withdrawableSum = 0
        withdrawableSumKZT = 0
        await sendTelegramMessage(chatId, 'Суммы для вывода (RUB и KZT) сброшены до 0')
        return
    }

    if (data.startsWith('export_') && ADMIN_IDS.has(userId)) {
        let filterStatus: 'all' | 'completed' | 'failed' | 'pending' = 'all'

        switch (data) {
            case 'export_completed': filterStatus = 'completed'; break
            case 'export_failed': filterStatus = 'failed'; break
            case 'export_pending': filterStatus = 'pending'; break
            case 'export_all': filterStatus = 'all'; break
        }

        const filteredTx = Array.from(transactions.values())
            .filter(tx => filterStatus === 'all' || tx.status === filterStatus)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        if (filteredTx.length === 0) {
            await sendTelegramMessage(chatId, `Нет транзакций со статусом "${filterStatus}"`)
            return
        }

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Платежи')

        const headers = [
            'ExternalID', 'UserID', 'Username', 'FirstName', 'LastName',
            'Amount', 'Currency', 'Status', 'Created', 'AdminID', 'Description'
        ]
        const headerRow = worksheet.addRow(headers)
        headerRow.font = { bold: true, size: 12 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        })

        const statusColors: Record<string, string> = {
            completed: 'C6EFCE',
            failed: 'FFC7CE',
            pending: 'FFEB9C'
        }

        for (const tx of filteredTx) {
            const u = storedUsers.get(tx.userId) || {
                username: '—', firstName: '—', lastName: '—'
            }

            const adminName = tx.adminId ? (ADMIN_NAMES[tx.adminId] || `Админ ${tx.adminId}`) : '—'

            const row = worksheet.addRow([
                tx.externalId,
                tx.userId,
                u.username,
                u.firstName,
                u.lastName,
                tx.amount,
                tx.currency,
                tx.status.toUpperCase(),
                tx.createdAt.toISOString().replace('T', ' ').slice(0, 19),
                adminName,
                tx.description
            ])

            if (statusColors[tx.status]) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColors[tx.status] } }
                })
            }
        }

        worksheet.columns.forEach((column, i) => {
            let maxLength = headers[i].length
            column.eachCell?.({ includeEmpty: true }, cell => {
                const length = cell.value ? cell.value.toString().length : 0
                if (length > maxLength) maxLength = length
            })
            column.width = Math.min(maxLength + 4, 60)
        })

        worksheet.views = [{ state: 'frozen', ySplit: 1 }]
        worksheet.autoFilter = { from: 'A1', to: `K${filteredTx.length + 1}` }

        const filename = `payments_${filterStatus}_${new Date().toISOString().slice(0, 10)}.xlsx`
        const filepath = path.join(TEMP_DIR, filename)

        await workbook.xlsx.writeFile(filepath)

        try {
            await sendDocument(chatId, filepath, {
                caption: `Экспорт: ${filterStatus} (${filteredTx.length} записей)`,
                filename
            })

            setTimeout(() => fs.unlink(filepath).catch(() => { }), 10 * 60 * 1000)
        } catch (err) {
            console.error('[xlsx export]', err)
            await sendTelegramMessage(chatId, 'Не удалось отправить XLSX-файл')
        }

        return
    }

    if (data.startsWith('pay:')) {
        const initialToken = data.slice(4)

        if (session.amount === 0) {
            session.status = 'waiting_amount'
            await sendTelegramMessage(chatId, `Сначала введите сумму (от ${MIN_AMOUNT} до 500000)`)
            return
        }

        session.selectedMethodToken = initialToken
        session.status = 'waiting_method'

        const method = METHODS.find(m => m.token === initialToken)
        if (!method) {
            await sendTelegramMessage(chatId, 'Метод не найден')
            return
        }

        const currency = method.currency

        const externalId = generateExternalId(userId)
        session.externalId = externalId
        session.createdAt = new Date()

        let paymentUrl = await createNirvanaOrder(session.amount, externalId, userId, initialToken, currency)

        if (!paymentUrl) {
            await sendTelegramMessage(chatId, `Метод ${initialToken} недоступен. Пробую другие...`)

            const tokens = await getAvailableTokens()
            let attempt = 0
            const MAX_ATTEMPTS = 180

            while (!paymentUrl && attempt < MAX_ATTEMPTS) {
                attempt++
                await new Promise(r => setTimeout(r, 10000))

                for (const t of tokens) {
                    if (t.currency.toUpperCase() !== currency.toUpperCase()) continue

                    const newExtId = generateExternalId(userId)
                    session.externalId = newExtId

                    const url = await createNirvanaOrder(
                        session.amount,
                        newExtId,
                        userId,
                        t.code,
                        t.currency
                    )

                    if (url) {
                        paymentUrl = url
                        session.selectedMethodToken = t.code
                        break
                    }
                }
            }

            if (!paymentUrl) {
                await sendTelegramMessage(chatId, 'Все методы недоступны. Попробуйте позже.')
                sessions.delete(chatId)
                return
            }
        }

        const refAdmin = usersRef.get(userId)?.refAdmin ?? null

        transactions.set(externalId, {
            userId,
            amount: session.amount,
            currency,
            status: 'pending',
            externalId,
            description: `Nirvana • ${session.selectedMethodToken}`,
            createdAt: new Date(),
            adminId: refAdmin
        })

        if (MAIN_ADMIN_IDS.has(userId)) {
            if (currency.toUpperCase() === 'RUB') {
                withdrawableSum += session.amount
            } else if (currency.toUpperCase() === 'KZT') {
                withdrawableSumKZT += session.amount
            }
        }

        const keyboard = { inline_keyboard: [[{ text: 'Оплатить', url: paymentUrl }]] }

        await sendTelegramMessage(chatId,
            `Сумма: ${session.amount} ${currency}\nСпособ: ${session.selectedMethodToken}\n\n`,
            keyboard
        )

        monitorPayment(chatId, externalId, userId, refAdmin, currency)
    }
}

async function monitorPayment(
    chatId: number,
    externalId: string,
    userId: number,
    refAdmin: number | null,
    currency: string = 'RUB'
) {
    const MAX_ATTEMPTS = 90
    let attempt = 0

    while (attempt < MAX_ATTEMPTS) {
        attempt++
        await new Promise(r => setTimeout(r, 10000))

        const info = await checkOrderStatus(externalId, currency)
        if (!info) continue

        if (info.status === 'SUCCESS') {
            const tx = transactions.get(externalId)
            if (!tx) return

            tx.status = 'completed'
            tx.updatedAt = new Date()

            await db.insert(telegramPayments).values({
                userId,
                amount: tx.amount.toString(),
                currency,
                status: 'completed',
                externalId,
                description: tx.description,
                refAdminId: refAdmin
            })

            if (MAIN_ADMIN_IDS.has(userId)) {
                if (currency.toUpperCase() === 'RUB') {
                    withdrawableSum += tx.amount
                } else if (currency.toUpperCase() === 'KZT') {
                    withdrawableSumKZT += tx.amount
                }
            }

            const payer = storedUsers.get(userId) || {
                firstName: 'Пользователь',
                lastName: undefined,
                username: undefined
            }

            const fullName = [payer.firstName, payer.lastName].filter(Boolean).join(' ') || 'без имени'

            let payerDisplay = payer.username
                ? `@${payer.username} (${fullName})`
                : `${fullName} (без username)`

            const successMsg = `💰 Успех: ${payerDisplay} → ${info.amount} ${currency} | ${externalId}`

            await sendTelegramMessage(chatId, successMsg)

            const admins = refAdmin ? [refAdmin, ...MAIN_ADMIN_IDS] : [...MAIN_ADMIN_IDS]
            for (const aid of admins) {
                if (aid !== chatId) {
                    await sendTelegramMessage(aid, successMsg)
                }
            }

            sessions.delete(chatId)
            return
        }

        if (info.status === 'ERROR') {
            const tx = transactions.get(externalId)
            if (tx) {
                tx.status = 'failed'
                tx.updatedAt = new Date()

                await db.insert(telegramPayments).values({
                    userId,
                    amount: tx.amount.toString(),
                    currency,
                    status: 'failed',
                    externalId,
                    description: tx.description,
                    refAdminId: refAdmin
                })
            }
            await sendTelegramMessage(chatId, '❌ Оплата не прошла')
            return
        }
    }

    await sendTelegramMessage(chatId, '⏰ Время ожидания истекло (15 мин). Введите /start')
    sessions.delete(chatId)
}

async function startPaymentBot() {
    await initDbTables()
    console.log(`[PayBot] Запущен ${new Date().toISOString()}`)

    await setupBotMenuAndCommands()

    while (isRunning) {
        try {
            const updates = await getUpdates(offset, 30)
            for (const u of updates) {
                offset = u.update_id + 1
                await processUpdate(u)
            }
        } catch (err: any) {
            console.error('[Polling] Ошибка:', err.message)
            const delay = Math.min(1000 * Math.pow(2, 1), 30000)
            await new Promise(r => setTimeout(r, delay))
        }
    }
}

export function stopPaymentBot() {
    isRunning = false
}

if (require.main === module) {
    startPaymentBot().catch(err => {
        console.error('[PayBot] Критическая ошибка:', err)
        process.exit(1)
    })
}

process.on('SIGINT', () => {
    console.log('[PayBot] Остановка...')
    isRunning = false
    setTimeout(() => process.exit(0), 1500)
})