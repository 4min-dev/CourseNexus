import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'

const TELEGRAM_BOT_TOKEN = process.env.PAY_TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Pay Bot] PAY_TELEGRAM_BOT_TOKEN не найден в .env')
    process.exit(1)
}

const TELEGRAM_BOT_API = 'https://api.telegram.org/bot'

export interface TelegramContact {
    phone_number: string,
    first_name: string,
    last_name?: string,
    user_id?: number
}

export interface TelegramMessage {
    message_id: number,
    from: {
        id: number,
        is_bot: boolean,
        first_name: string,
        last_name?: string,
        username?: string,
    },
    chat: {
        id: number,
        first_name: string,
        last_name?: string,
        username?: string,
        type: string,
    },
    date: number,
    text?: string,
    contact?: TelegramContact
}

export interface TelegramCallbackQuery {
    id: string,
    from: {
        id: number,
        is_bot: boolean,
        first_name: string,
        last_name?: string,
        username?: string,
    },
    message?: TelegramMessage,
    chat_instance: string,
    data?: string
}

export interface TelegramUpdate {
    update_id: number,
    message?: TelegramMessage,
    callback_query?: TelegramCallbackQuery
}

const proxyUrl = 'http://scidrov8616:dbec3d@162.19.173.183:10529';

const agent = new HttpsProxyAgent(proxyUrl, {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 15000
})

export const telegramAxios = axios.create({
    httpAgent: agent,
    httpsAgent: agent,
    timeout: 30000,
    validateStatus: status => status >= 200 && status < 300,
})

export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: any
): Promise<boolean> {
    try {
        const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/sendMessage`
        const payload: any = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        }

        if (replyMarkup) {
            payload.reply_markup = replyMarkup
        }

        const response = await telegramAxios.post(url, payload)

        if (response.data.ok) {
            console.log(`[PayBot] Сообщение отправлено в ${chatId}`)
            return true
        } else {
            console.error('[PayBot] Ошибка отправки сообщения:', response.data)
            return false
        }
    } catch (error) {
        console.error('[PayBot] Ошибка при отправке сообщения:', error)
        return false
    }
}

export async function answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
): Promise<boolean> {
    try {
        const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`
        const payload: any = {
            callback_query_id: callbackQueryId,
            show_alert: showAlert,
        }

        if (text) {
            payload.text = text
        }

        const response = await telegramAxios.post(url, payload)

        return response.data.ok
    } catch (error) {
        console.error('[PayBot] Ошибка answerCallbackQuery:', error)
        return false
    }
}

export async function getUpdates(offset?: number, timeout: number = 30): Promise<TelegramUpdate[]> {
    try {
        const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/getUpdates`
        const params: any = {
            timeout,
            allowed_updates: ['message', 'callback_query'],
        }

        if (offset !== undefined) {
            params.offset = offset
        }

        const response = await telegramAxios.post(url, params)

        if (response.data.ok) {
            return response.data.result || []
        } else {
            console.error('[PayBot] Ошибка getUpdates:', response.data)
            return []
        }
    } catch (error) {
        console.error('[PayBot] Ошибка при getUpdates:', error)
        return []
    }
}