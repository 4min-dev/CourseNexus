import { ProxyAgent, fetch as undiciFetch } from "undici";

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyNewConversation: boolean;
  notifyNewMessage: boolean;
  notifyPurchase: boolean;
  notifyTopup: boolean;
  notifyReview: boolean;
  notifyCourseRequest: boolean;
}

let cachedConfig: TelegramConfig | null = null;
let configLoadedAt = 0;
const CONFIG_TTL = 30000;

const PROXY_URL = 'http://scidrov8616:dbec3d@162.19.173.183:10529';

const dispatcher = new ProxyAgent({
  uri: PROXY_URL,
  token: undefined,
});

export function clearTelegramConfigCache() {
  cachedConfig = null;
  configLoadedAt = 0;
}

export async function loadTelegramConfig(getSettings: () => Promise<any>): Promise<TelegramConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - configLoadedAt < CONFIG_TTL) return cachedConfig;
  try {
    const settings = await getSettings();
    if (!settings?.telegramEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
      cachedConfig = null;
      configLoadedAt = now;
      return null;
    }
    cachedConfig = {
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
      enabled: settings.telegramEnabled,
      notifyNewConversation: settings.telegramNotifyNewConversation ?? true,
      notifyNewMessage: settings.telegramNotifyNewMessage ?? true,
      notifyPurchase: settings.telegramNotifyPurchase ?? true,
      notifyTopup: settings.telegramNotifyTopup ?? true,
      notifyReview: settings.telegramNotifyReview ?? true,
      notifyCourseRequest: settings.telegramNotifyCourseRequest ?? true,
    };
    configLoadedAt = now;
    return cachedConfig;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTgMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      dispatcher,
    });
    const data = await res.json() as any;
    if (!data.ok) {
      console.error("[TelegramNotifier] Send failed:", data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[TelegramNotifier] Error:", err);
    return false;
  }
}

export async function notifyNewConversation(
  getSettings: () => Promise<any>,
  opts: { userName: string; subject: string; conversationId: string; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyNewConversation) return;

  const text =
    `🆕 <b>Новый чат поддержки</b>\n\n` +
    `👤 <b>От:</b> ${escapeHtml(opts.userName)}\n` +
    `📝 <b>Тема:</b> ${escapeHtml(opts.subject || "Без темы")}\n` +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/chat">Открыть в панели</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, text);
}

export async function notifyNewMessage(
  getSettings: () => Promise<any>,
  opts: { userName: string; messageText: string; conversationId: string; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyNewMessage) return;

  const preview = opts.messageText.length > 200
    ? opts.messageText.substring(0, 200) + "..."
    : opts.messageText;

  const text =
    `💬 <b>Новое сообщение</b>\n\n` +
    `👤 <b>От:</b> ${escapeHtml(opts.userName)}\n` +
    `📩 ${escapeHtml(preview)}\n` +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/chat">Открыть в панели</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, text);
}

export async function notifyPurchase(
  getSettings: () => Promise<any>,
  opts: { userName: string; userEmail: string; courseTitle: string; price: string; paymentType: string; isVip: boolean; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyPurchase) return;

  const icon = opts.isVip ? "👑" : "🛒";
  const typeLabel = opts.isVip ? "VIP пакет" : "Курс";

  const text =
    `${icon} <b>Новая покупка</b>\n\n` +
    `👤 <b>Покупатель:</b> ${escapeHtml(opts.userName)}\n` +
    `📧 ${escapeHtml(opts.userEmail)}\n` +
    `📦 <b>${typeLabel}:</b> ${escapeHtml(opts.courseTitle)}\n` +
    `💰 <b>Сумма:</b> ${escapeHtml(opts.price)} ${opts.paymentType === "fantiks" ? "фантиков" : "₽"}\n` +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/users">Панель управления</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, text);
}

export async function notifyTopup(
  getSettings: () => Promise<any>,
  opts: { userName: string; userEmail: string; amount: string; currency?: string; method?: string; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyTopup) return;

  const curr = opts.currency || "₽";

  const text =
    `💳 <b>Пополнение баланса</b>\n\n` +
    `👤 <b>Пользователь:</b> ${escapeHtml(opts.userName)}\n` +
    `📧 ${escapeHtml(opts.userEmail)}\n` +
    `💰 <b>Сумма:</b> ${escapeHtml(opts.amount)} ${escapeHtml(curr)}\n` +
    (opts.method ? `📱 <b>Способ:</b> ${escapeHtml(opts.method)}\n` : "") +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/users">Панель управления</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, text);
}

export async function notifyReview(
  getSettings: () => Promise<any>,
  opts: { userName: string; courseTitle: string; rating: number; text: string; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyReview) return;

  const stars = "⭐".repeat(Math.min(opts.rating, 5));
  const preview = opts.text.length > 200 ? opts.text.substring(0, 200) + "..." : opts.text;

  const msg =
    `📝 <b>Новый отзыв</b>\n\n` +
    `👤 <b>От:</b> ${escapeHtml(opts.userName)}\n` +
    `📦 <b>Курс:</b> ${escapeHtml(opts.courseTitle)}\n` +
    `${stars} (${opts.rating}/5)\n` +
    `💬 ${escapeHtml(preview)}\n` +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/moderation">Модерация</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, msg);
}

export async function notifyCourseRequest(
  getSettings: () => Promise<any>,
  opts: { userName: string; title: string; description: string; siteUrl?: string }
) {
  const config = await loadTelegramConfig(getSettings);
  if (!config || !config.notifyCourseRequest) return;

  const preview = opts.description.length > 200 ? opts.description.substring(0, 200) + "..." : opts.description;

  const text =
    `📋 <b>Новый запрос курса</b>\n\n` +
    `👤 <b>От:</b> ${escapeHtml(opts.userName)}\n` +
    `📝 <b>Курс:</b> ${escapeHtml(opts.title)}\n` +
    `💬 ${escapeHtml(preview)}\n` +
    (opts.siteUrl ? `\n🔗 <a href="${opts.siteUrl}/admin/moderation">Модерация</a>` : "");

  await sendTgMessage(config.botToken, config.chatId, text);
}

export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string; botName?: string }> {
  try {
    const meRes = await undiciFetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json() as any;
    if (!meData.ok) {
      return { ok: false, error: "Неверный токен бота" };
    }
    const botName = meData.result?.first_name || meData.result?.username || "Bot";

    const testText = `✅ Тестовое уведомление от <b>В Курсе?</b>\n\nБот <b>${escapeHtml(botName)}</b> успешно подключён к чату поддержки.`;
    const sendRes = await undiciFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: testText, parse_mode: "HTML" }),
    });
    const sendData = await sendRes.json() as any;
    if (!sendData.ok) {
      if (sendData.description?.includes("chat not found")) {
        return { ok: false, error: "Chat ID не найден. Убедитесь, что бот добавлен в чат." };
      }
      return { ok: false, error: sendData.description || "Ошибка отправки" };
    }

    return { ok: true, botName };
  } catch (err: any) {
    return { ok: false, error: err.message || "Ошибка соединения" };
  }
}
