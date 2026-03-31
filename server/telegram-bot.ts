import crypto from 'crypto';
import { getUpdates, generateVerificationCode, deleteTelegramWebhook, answerCallbackQuery, setTelegramWebhook, sendTelegramPhotoByUrl } from './telegram';
import type { TelegramUpdate } from './telegram';
import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { and, isNotNull, lt, eq } from 'drizzle-orm';

interface LinkingSession {
  codeHash: string;
  telegramId: number;
  chatId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  userId?: string;
  expiresAt: Date;
  verified: boolean;
}

interface TwoFactorSession {
  codeHash: string;
  chatId: number;
  email: string;
  expiresAt: Date;
  attempts: number;
}

interface PasswordResetSession {
  codeHash: string;
  userId: string;
  email: string;
  chatId: number;
  expiresAt: Date;
  attempts: number;
}

const linkingSessions = new Map<string, LinkingSession>();
const twoFactorSessions = new Map<string, TwoFactorSession>();
const passwordResetSessions = new Map<string, PasswordResetSession>();

const photoUrl = 'https://cdn.go.vkurse.io/vkurse/1771888850920_photo_2026-02-10_02-01-04.jpg';

const linkingAttempts = new Map<string, { count: number; resetAt: Date }>();
const verificationAttempts = new Map<string, { count: number; resetAt: Date }>();

// ────────────────────────────────────────────────
// Тексты напоминаний (все 4 варианта)
// ────────────────────────────────────────────────

export const lastReminderLevelMap = new Map<string, number>(); // userId → индекс шаблона (0..3)


// ────────────────────────────────────────────────
// Тексты напоминаний (все 4 варианта) — оставляем как есть
// ────────────────────────────────────────────────

const INACTIVITY_TEMPLATES = [
  {
    minDays: 7,
    maxDays: 13,
    getText: (days: number, name?: string) =>
      `Тебя не было уже ${days} дней а здесь кипит работа над новыми материалами 🎯\n\n` +
      `Вышли курсы и модули которые точно стоит увидеть 💥\n` +
      `Давай продолжим твой рост?\n\n` +
      `<a href="https://go.vkurse.io/">Посмотреть новинки</a> 🚀`
  },
  {
    minDays: 14,
    maxDays: 29,
    getText: (days: number, name?: string) =>
      `Тебя не было уже ${days} дней а мы выложили новые курсы и сделали платформу еще удобнее 🔥\n\n` +
      `Свежий контент + новые инструменты для твоих целей 🚀\n\n` +
      `Самое время вернуться и наверстать 😏\n` +
      `<a href="https://go.vkurse.io/">Смотреть что нового</a>`
  },
  {
    minDays: 30,
    maxDays: 59,
    getText: (days: number, name?: string) =>
      `Тебя не было уже месяц а здесь всё ещё те же топ-курсы от известных спикеров по реально низкой цене 🔥\n\n` +
      `Ты уже знаешь систему — не теряй преимущество и доступ к свежему контенту без наценок 🚀\n\n` +
      `Загляни в свой аккаунт и продолжи на своих условиях\n` +
      `<a href="https://go.vkurse.io/">Войти в аккаунт</a>`
  },
  {
    minDays: 60,
    maxDays: Infinity,
    getText: (days: number, name?: string) =>
      `Тебя не было уже ${days >= 60 ? 'два месяца' : days + ' дней'} а сайт серьёзно обновился 😏\n\n` +
      `Новые материалы новые инструменты новые разделы — всё ждёт твоего взгляда\n\n` +
      `Загляни и оцени изменения\n` +
      `<a href="https://go.vkurse.io/">Открыть сайт</a> 🚀`
  }
];

// ────────────────────────────────────────────────
// Основная функция отправки напоминаний (анти-спам)
// ────────────────────────────────────────────────

export async function sendInactivityReminders() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let candidates;
  try {
    candidates = await db
      .select({
        id: users.id,
        telegramChatId: users.telegramChatId,
        telegramFirstName: users.telegramFirstName,
        firstName: users.firstName,
        lastActivityAt: users.lastActivityAt
      })
      .from(users)
      .where(
        and(
          isNotNull(users.telegramChatId),
          lt(users.lastActivityAt, sevenDaysAgo)
        )
      )
      .limit(800);

    console.log(`[Inactivity] Найдено кандидатов: ${candidates?.length || 0}`);
  } catch (err) {
    console.error('[Inactivity] Ошибка выборки:', err);
    return;
  }

  if (!candidates?.length) {
    console.log('[Inactivity] Нет неактивных пользователей с Telegram');
    return;
  }

  let sent = 0;

  for (const user of candidates) {
    if (!user.telegramChatId || !/^\d{5,15}$/.test(user.telegramChatId)) {
      console.log(`[Inactivity] Пропуск некорректного chat_id: ${user.telegramChatId || 'NULL'} для user ${user.id}`);
      continue;
    }

    const daysAbsent = Math.floor(
      (now.getTime() - new Date(user.lastActivityAt!).getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentTemplateIndex = INACTIVITY_TEMPLATES.findIndex(
      t => daysAbsent >= t.minDays && daysAbsent <= t.maxDays
    );

    if (currentTemplateIndex === -1) continue;

    const currentTemplate = INACTIVITY_TEMPLATES[currentTemplateIndex];

    // Проверка: отправляли ли уже напоминание на этом или более высоком уровне
    const lastLevel = lastReminderLevelMap.get(user.id);
    if (lastLevel !== undefined && currentTemplateIndex <= lastLevel) {
      console.log(
        `[Inactivity] Пропуск ${user.id}: уровень не вырос (${currentTemplateIndex} ≤ ${lastLevel})`
      );
      continue;
    }

    const name = user.telegramFirstName || user.firstName || undefined;
    const message = currentTemplate.getText(daysAbsent, name);

    try {
      const success = await sendTelegramPhotoByUrl(
        user.telegramChatId,
        photoUrl,
        message
      );

      if (success) {
        sent++;

        // Сохраняем уровень, на котором отправили напоминание
        lastReminderLevelMap.set(user.id, currentTemplateIndex);

        console.log(
          `[Inactivity] Отправлено ${user.id} (${user.telegramChatId}): ${daysAbsent} дней ` +
          `(уровень ${currentTemplateIndex} — ${currentTemplate.minDays}–${currentTemplate.maxDays} дней)`
        );

        // небольшая задержка между отправками, чтобы не попасть под лимиты Telegram
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      }
    } catch (err) {
      console.error(`[Inactivity] Ошибка отправки ${user.id} (${user.telegramChatId}):`, err);
    }
  }

  console.log(`[Inactivity] Всего отправлено новых напоминаний: ${sent}`);
}

// ────────────────────────────────────────────────
// Очистка сессий (без изменений)
// ────────────────────────────────────────────────

setInterval(() => {
  const now = new Date();

  Array.from(linkingSessions.entries()).forEach(([codeHash, session]) => {
    if (session.expiresAt < now) linkingSessions.delete(codeHash);
  });

  Array.from(twoFactorSessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) twoFactorSessions.delete(sessionId);
  });

  Array.from(passwordResetSessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) passwordResetSessions.delete(sessionId);
  });

  Array.from(linkingAttempts.entries()).forEach(([key, data]) => {
    if (data.resetAt < now) linkingAttempts.delete(key);
  });

  Array.from(verificationAttempts.entries()).forEach(([key, data]) => {
    if (data.resetAt < now) verificationAttempts.delete(key);
  });
}, 5 * 60 * 1000);

// ────────────────────────────────────────────────
// Остальные функции (без изменений)
// ────────────────────────────────────────────────

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function verifyLinkingCode(code: string): LinkingSession | null {
  const codeHash = hashCode(code);
  const session = linkingSessions.get(codeHash);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    linkingSessions.delete(codeHash);
    return null;
  }
  session.verified = true;
  return session;
}

export function deleteLinkingSession(code: string): void {
  const codeHash = hashCode(code);
  linkingSessions.delete(codeHash);
}

export function create2FASession(email: string, chatId: number): { sessionId: string; code: string } {
  const sessionId = crypto.randomUUID();
  const code = generateVerificationCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  twoFactorSessions.set(sessionId, { codeHash, chatId, email, expiresAt, attempts: 0 });

  console.log(`[Telegram Bot] Created 2FA session for email: ${email}`);

  return { sessionId, code };
}

export function verify2FACode(sessionId: string, code: string): { valid: boolean; email?: string } {
  const session = twoFactorSessions.get(sessionId);
  if (!session) return { valid: false };
  if (session.expiresAt < new Date()) {
    twoFactorSessions.delete(sessionId);
    return { valid: false };
  }

  session.attempts++;
  if (session.attempts > 5) {
    twoFactorSessions.delete(sessionId);
    return { valid: false };
  }

  const codeHash = hashCode(code);
  if (session.codeHash !== codeHash) return { valid: false };

  const email = session.email;
  twoFactorSessions.delete(sessionId);
  return { valid: true, email };
}

export function createPasswordResetSession(userId: string, email: string, chatId: number): { sessionId: string; code: string } {
  const sessionId = crypto.randomUUID();
  const code = generateVerificationCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  passwordResetSessions.set(sessionId, { codeHash, userId, email, chatId, expiresAt, attempts: 0 });

  console.log(`[Telegram Bot] Created password reset session for user: ${userId}`);

  return { sessionId, code };
}

export function verifyPasswordResetCode(sessionId: string, code: string): { valid: boolean; userId?: string; email?: string } {
  const session = passwordResetSessions.get(sessionId);
  if (!session) return { valid: false };
  if (session.expiresAt < new Date()) {
    passwordResetSessions.delete(sessionId);
    return { valid: false };
  }

  session.attempts++;
  if (session.attempts > 5) {
    passwordResetSessions.delete(sessionId);
    return { valid: false };
  }

  const codeHash = hashCode(code);
  if (session.codeHash !== codeHash) return { valid: false };

  const userId = session.userId;
  const email = session.email;
  passwordResetSessions.delete(sessionId);
  return { valid: true, userId, email };
}

export async function processResetPasswordCommand(telegramId: number, chatId: number, firstName: string): Promise<void> {
  const { storage } = await import('./storage');
  const user = await storage.getUserByTelegramChatId(chatId.toString());

  if (!user) {
    await sendTelegramPhotoByUrl(
      chatId,
      photoUrl,
      `❌ <b>Telegram не привязан</b>\n\nТвой Telegram не привязан ни к одному аккаунту на платформе <b>"В Курсе ?"</b>\n\nЧтобы сбросить пароль, сначала привяжи Telegram к своему аккаунту командой /start 🔗`
    );
    console.log(`[Telegram Bot] Password reset attempt from unlinked chatId ${chatId}`);
    return;
  }

  const { sessionId, code } = createPasswordResetSession(user.id, user.email!, chatId);

  const appBaseUrl = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const resetLink = `${appBaseUrl}/reset-password?session=${sessionId}`;

  const inlineKeyboard = {
    inline_keyboard: [[{ text: "🔐 Сбросить пароль", url: resetLink }]]
  };

  await sendTelegramPhotoByUrl(
    chatId,
    photoUrl,
    `🔐 <b>Сброс пароля</b>\n\nПривет${firstName ? ', ' + firstName : ''}! Ты запросил сброс пароля для аккаунта:\n\n📧 <code>${user.email}</code>\n\n<b>Для установки нового пароля:</b>\n\n1️⃣ Нажми на кнопку ниже или перейди по ссылке:\n${resetLink}\n\n2️⃣ Введи этот код:\n\n🔐 <code>${code}</code>\n\n3️⃣ Установи новый пароль\n\n⏱️ Код действителен 10 минут.\n\n⚠️ Если ты не запрашивал сброс пароля, просто проигнорируй это сообщение.`,
    inlineKeyboard
  );

  console.log(`[Telegram Bot] Sent password reset link to user ${user.id} (chatId ${chatId})`);
}

export async function processStartCommand(telegramId: number, chatId: number, username: string | undefined, firstName: string, lastName: string | undefined): Promise<void> {
  const effectiveUsername = username || telegramId.toString();

  console.log('existingUser before');
  const existingUser = await storage.getUserByTelegramChatId(chatId.toString());
  console.log('existingUser after');

  if (existingUser) {
    await sendTelegramPhotoByUrl(
      chatId,
      photoUrl,
      `👋 <b>С возвращением${firstName ? ', ' + firstName : ''}!</b>\n\nТвой аккаунт уже привязан к платформе <b>"В Курсе ?"</b> 🎉\n\n✅ Двухфакторная защита активна\n✅ Уведомления настроены\n\nЕсли нужна помощь — я всегда на связи! 🚀`
    );
    console.log(`[Telegram Bot] User ${existingUser.id} already linked (chatId ${chatId})`);
    return;
  }

  const now = new Date();
  Array.from(linkingSessions.entries()).forEach(([codeHash, session]) => {
    if (session.chatId === chatId && session.expiresAt > now && !session.verified) {
      session.username = effectiveUsername;
      console.log(`[Telegram Bot] Updated username for existing session: ${effectiveUsername}`);
    }
  });

  const code = generateVerificationCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  linkingSessions.set(codeHash, {
    codeHash,
    telegramId,
    chatId,
    username: effectiveUsername,
    firstName,
    lastName: lastName || undefined,
    expiresAt,
    verified: false,
  });

  const inlineKeyboard = {
    inline_keyboard: [[{ text: "🔄 Получить новый код", callback_data: "get_new_code" }]]
  };

  await sendTelegramPhotoByUrl(
    chatId,
    photoUrl,
    `👋 <b>Привет${firstName ? ', ' + firstName : ''}!</b>\n\nЯ бот образовательной платформы <b>"В Курсе ?"</b> и твой главный помощник! 🚀\n\n<b>Для чего необходимо привязать Telegram:</b>\n\n• 🌐 <b>Всегда на связи</b> — интернет в России сейчас непредсказуем, но мы всегда найдём способ тебя уведомить!\n\n• 🔗 <b>Зеркала сайта</b> — если основной сайт заблокируют, я первым пришлю ссылку на зеркало\n\n• 🔐 <b>Безопасность</b> — двухфакторная защита твоего аккаунта\n\n• 📚 <b>Не пропустишь ничего</b> — уведомления о новых уроках в купленных курсах и важные обновления\n\n<b>Давай начнём!</b> Введи этот код на сайте:\n\n🔐 <code>${code}</code>\n\n⏱️ Код действителен 10 минут.`,
    inlineKeyboard
  );

  console.log(`[Telegram Bot] Sent linking code to chat_id ${chatId} (${effectiveUsername})`);
}

let isRunning = false;
let offset: number | undefined = undefined;

export async function startTelegramBot(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const webhookUrl = 'https://go.vkurse.io/telegram-webhook';

  console.log('[Telegram] Setting webhook to:', webhookUrl);

  await deleteTelegramWebhook();
  const success = await setTelegramWebhook(webhookUrl);

  if (!success) {
    console.error('[Telegram] Webhook setup failed, falling back to polling');
    pollUpdates();
  }

  console.log('[Telegram Bot] Bot started');
}

async function pollUpdates(): Promise<void> {
  while (isRunning) {
    try {
      console.time('[Telegram] getUpdates duration');
      const updates: TelegramUpdate[] = await getUpdates(offset, 100);
      console.timeEnd('[Telegram] getUpdates duration');

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.callback_query) {
          const cq = update.callback_query;
          const telegramId = cq.from.id;
          const chatId = cq.message?.chat.id;
          const username = cq.from.username;
          const firstName = cq.from.first_name;
          const lastName = cq.from.last_name;

          console.log(`[Telegram Bot] Received callback query from ${chatId}: ${cq.data}`);

          if (cq.data === 'get_new_code' && chatId) {
            await answerCallbackQuery(cq.id, '🔄 Генерирую новый код...');
            await processStartCommand(telegramId, chatId, username, firstName, lastName);
          }
        }

        if (update.message) {
          const msg = update.message;
          const telegramId = msg.from.id;
          const chatId = msg.chat.id;
          const username = msg.from.username;
          const firstName = msg.from.first_name;
          const lastName = msg.from.last_name;

          if (msg.text) {
            const text = msg.text;
            console.log(`[Telegram Bot] Received message from ${chatId}: ${text}`);

            if (text.startsWith('/start')) {
              console.log('[Telegram Bot] Start process command');
              await processStartCommand(telegramId, chatId, username, firstName, lastName);
            }

            if (text.startsWith('/reset_password')) {
              await processResetPasswordCommand(telegramId, chatId, firstName);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Telegram Bot] Error in polling loop:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export function stopTelegramBot(): void {
  console.log('[Telegram Bot] Stopping bot...');
  isRunning = false;
}