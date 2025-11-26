import crypto from 'crypto';
import { getUpdates, sendTelegramMessage, sendTelegramPhoto, generateVerificationCode, deleteTelegramWebhook, answerCallbackQuery } from './telegram';
import type { TelegramUpdate } from './telegram';

// In-memory storage for linking codes (indexed by code hash)
interface LinkingSession {
  codeHash: string; // SHA-256 hash of code (plaintext never stored)
  telegramId: number; // Telegram user ID (from.id)
  chatId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string; // Phone number from Telegram contact
  userId?: string; // User ID from website (set when code is verified)
  expiresAt: Date;
  verified: boolean; // Has the user verified the code on the website?
}

interface TwoFactorSession {
  codeHash: string; // SHA-256 hash of code (plaintext never stored)
  chatId: number;
  email: string;
  expiresAt: Date;
  attempts: number;
}

interface PasswordResetSession {
  codeHash: string; // SHA-256 hash of code (plaintext never stored)
  userId: string; // User ID who requested reset
  email: string;
  chatId: number;
  expiresAt: Date;
  attempts: number;
}

// Storage maps - indexed by code hash for linking, sessionId for 2FA/password reset
const linkingSessions = new Map<string, LinkingSession>(); // key: codeHash
const twoFactorSessions = new Map<string, TwoFactorSession>(); // key: sessionId
const passwordResetSessions = new Map<string, PasswordResetSession>(); // key: sessionId

// Rate limiting maps
const linkingAttempts = new Map<string, { count: number; resetAt: Date }>();
const verificationAttempts = new Map<string, { count: number; resetAt: Date }>();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = new Date();

  // Clean linking sessions
  Array.from(linkingSessions.entries()).forEach(([codeHash, session]) => {
    if (session.expiresAt < now) {
      linkingSessions.delete(codeHash);
    }
  });

  // Clean 2FA sessions
  Array.from(twoFactorSessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) {
      twoFactorSessions.delete(sessionId);
    }
  });

  // Clean password reset sessions
  Array.from(passwordResetSessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) {
      passwordResetSessions.delete(sessionId);
    }
  });

  // Clean rate limit maps
  Array.from(linkingAttempts.entries()).forEach(([key, data]) => {
    if (data.resetAt < now) {
      linkingAttempts.delete(key);
    }
  });
  Array.from(verificationAttempts.entries()).forEach(([key, data]) => {
    if (data.resetAt < now) {
      verificationAttempts.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Hash a code using SHA-256
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify linking code (called from website)
 */
export function verifyLinkingCode(code: string): LinkingSession | null {
  const codeHash = hashCode(code);
  const session = linkingSessions.get(codeHash);

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    linkingSessions.delete(codeHash);
    return null;
  }

  // Mark as verified
  session.verified = true;

  return session;
}

/**
 * Delete linking session after successful linking
 */
export function deleteLinkingSession(code: string): void {
  const codeHash = hashCode(code);
  linkingSessions.delete(codeHash);
}

/**
 * Create a 2FA session for login (returns code for immediate dispatch, never stores plaintext)
 */
export function create2FASession(email: string, chatId: number): { sessionId: string; code: string } {
  const sessionId = crypto.randomUUID();
  const code = generateVerificationCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // SECURITY: Store only hash, never plaintext code
  twoFactorSessions.set(sessionId, {
    codeHash,
    chatId,
    email,
    expiresAt,
    attempts: 0,
  });

  console.log(`[Telegram Bot] Created 2FA session for email: ${email}`);

  // Return code for immediate Telegram dispatch, caller must not store it
  return { sessionId, code };
}

/**
 * Verify 2FA code
 */
export function verify2FACode(sessionId: string, code: string): { valid: boolean; email?: string } {
  const session = twoFactorSessions.get(sessionId);

  if (!session) {
    return { valid: false };
  }

  if (session.expiresAt < new Date()) {
    twoFactorSessions.delete(sessionId);
    return { valid: false };
  }

  // Rate limiting: max 5 attempts per session
  session.attempts++;
  if (session.attempts > 5) {
    twoFactorSessions.delete(sessionId);
    return { valid: false };
  }

  const codeHash = hashCode(code);
  if (session.codeHash !== codeHash) {
    return { valid: false };
  }

  // Valid code - delete session (single use)
  const email = session.email;
  twoFactorSessions.delete(sessionId);

  return { valid: true, email };
}

/**
 * Create a password reset session (returns sessionId and code for immediate dispatch)
 */
export function createPasswordResetSession(userId: string, email: string, chatId: number): { sessionId: string; code: string } {
  const sessionId = crypto.randomUUID();
  const code = generateVerificationCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // SECURITY: Store only hash, never plaintext code
  passwordResetSessions.set(sessionId, {
    codeHash,
    userId,
    email,
    chatId,
    expiresAt,
    attempts: 0,
  });

  console.log(`[Telegram Bot] Created password reset session for user: ${userId}`);

  // Return code for immediate Telegram dispatch, caller must not store it
  return { sessionId, code };
}

/**
 * Verify password reset code and return userId if valid
 */
export function verifyPasswordResetCode(sessionId: string, code: string): { valid: boolean; userId?: string; email?: string } {
  const session = passwordResetSessions.get(sessionId);

  if (!session) {
    return { valid: false };
  }

  if (session.expiresAt < new Date()) {
    passwordResetSessions.delete(sessionId);
    return { valid: false };
  }

  // Rate limiting: max 5 attempts per session
  session.attempts++;
  if (session.attempts > 5) {
    passwordResetSessions.delete(sessionId);
    return { valid: false };
  }

  const codeHash = hashCode(code);
  if (session.codeHash !== codeHash) {
    return { valid: false };
  }

  // Valid code - delete session (single use)
  const userId = session.userId;
  const email = session.email;
  passwordResetSessions.delete(sessionId);

  return { valid: true, userId, email };
}

/**
 * Process /reset_password command (generate and send password reset code)
 */
async function processResetPasswordCommand(telegramId: number, chatId: number, firstName: string): Promise<void> {
  // Check if this Telegram is linked to a user
  const { storage } = await import('./storage');
  const user = await storage.getUserByTelegramChatId(chatId.toString());

  if (!user) {
    // Not linked - cannot reset password
    await sendTelegramPhoto(
      chatId,
      'attached_assets/bot_welcome_logo.png',
      `❌ <b>Telegram не привязан</b>\n\nТвой Telegram не привязан ни к одному аккаунту на платформе <b>"В Курсе ?"</b>\n\nЧтобы сбросить пароль, сначала привязи Telegram к своему аккаунту командой /start 🔗`
    );
    console.log(`[Telegram Bot] Password reset attempt from unlinked chatId ${chatId}`);
    return;
  }

  // User is linked - generate reset code
  const { sessionId, code } = createPasswordResetSession(user.id, user.email!, chatId);

  // Generate reset link with sessionId
  const appBaseUrl = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const resetLink = `${appBaseUrl}/reset-password?session=${sessionId}`;

  // Inline keyboard с кнопкой для перехода на страницу сброса
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "🔐 Сбросить пароль",
          url: resetLink
        }
      ]
    ]
  };

  // Send password reset code
  await sendTelegramPhoto(
    chatId,
    'attached_assets/bot_welcome_logo.png',
    `🔐 <b>Сброс пароля</b>\n\nПривет${firstName ? ', ' + firstName : ''}! Ты запросил сброс пароля для аккаунта:\n\n📧 <code>${user.email}</code>\n\n<b>Для установки нового пароля:</b>\n\n1️⃣ Нажми на кнопку ниже или перейди по ссылке:\n${resetLink}\n\n2️⃣ Введи этот код:\n\n🔐 <code>${code}</code>\n\n3️⃣ Установи новый пароль\n\n⏱️ Код действителен 10 минут.\n\n⚠️ Если ты не запрашивал сброс пароля, просто проигнорируй это сообщение.`,
    inlineKeyboard
  );

  console.log(`[Telegram Bot] Sent password reset link to user ${user.id} (chatId ${chatId})`);
}

/**
 * Process /start command (generate and send linking code)
 */
async function processStartCommand(telegramId: number, chatId: number, username: string | undefined, firstName: string, lastName: string | undefined): Promise<void> {
  // Use user ID as fallback if username is not set
  const effectiveUsername = username || telegramId.toString();

  // Check if this Telegram is already linked to a user
  const { storage } = await import('./storage');
  const existingUser = await storage.getUserByTelegramChatId(chatId.toString());

  if (existingUser) {
    // Already linked - send photo with friendly message
    await sendTelegramPhoto(
      chatId,
      'attached_assets/bot_welcome_logo.png',
      `👋 <b>С возвращением${firstName ? ', ' + firstName : ''}!</b>\n\nТвой аккаунт уже привязан к платформе <b>"В Курсе ?"</b> 🎉\n\n✅ Двухфакторная защита активна\n✅ Уведомления настроены\n\nЕсли нужна помощь — я всегда на связи! 🚀`
    );
    console.log(`[Telegram Bot] User ${existingUser.id} already linked (chatId ${chatId})`);
    return;
  }

  // Not linked yet - check if there's an existing active session and update username
  const now = new Date();
  Array.from(linkingSessions.entries()).forEach(([codeHash, session]) => {
    if (session.chatId === chatId && session.expiresAt > now && !session.verified) {
      // Update username in case user changed it
      session.username = effectiveUsername;
      console.log(`[Telegram Bot] Updated username for existing session: ${effectiveUsername}`);
    }
  });

  // Generate unique 6-digit verification code
  const code = generateVerificationCode();
  const codeHash = hashCode(code);

  // Session expires in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Create linking session indexed by code hash
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
    inline_keyboard: [
      [
        {
          text: "🔄 Получить новый код",
          callback_data: "get_new_code"
        }
      ]
    ]
  };

  // Send welcome photo with code and inline button
  await sendTelegramPhoto(
    chatId,
    'attached_assets/bot_welcome_logo.png',
    `👋 <b>Привет${firstName ? ', ' + firstName : ''}!</b>\n\nЯ бот образовательной платформы <b>"В Курсе ?"</b> и твой главный помощник! 🚀\n\n<b>Для чего необходимо привязать Telegram:</b>\n\n• 🌐 <b>Всегда на связи</b> — интернет в России сейчас непредсказуем, но мы всегда найдём способ тебя уведомить!\n\n• 🔗 <b>Зеркала сайта</b> — если основной сайт заблокируют, я первым пришлю ссылку на зеркало\n\n• 🔐 <b>Безопасность</b> — двухфакторная защита твоего аккаунта\n\n• 📚 <b>Не пропустишь ничего</b> — уведомления о новых уроках в купленных курсах и важные обновления\n\n<b>Давай начнём!</b> Введи этот код на сайте:\n\n🔐 <code>${code}</code>\n\n⏱️ Код действителен 10 минут.`,
    inlineKeyboard
  );

  console.log(`[Telegram Bot] Sent linking code to chat_id ${chatId} (${effectiveUsername})`);
}


/**
 * Main bot polling loop
 */
let isRunning = false;
let offset: number | undefined = undefined;

export async function startTelegramBot(): Promise<void> {
  if (isRunning) {
    console.log('[Telegram Bot] Bot is already running');
    return;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] TELEGRAM_BOT_TOKEN not configured, bot will not start');
    return;
  }

  console.log('[Telegram Bot] Starting polling-based bot...');

  // Delete webhook first (switch to polling mode)
  await deleteTelegramWebhook();

  isRunning = true;

  // Start polling loop
  pollUpdates();
}

async function pollUpdates(): Promise<void> {
  while (isRunning) {
    try {
      const updates: TelegramUpdate[] = await getUpdates(offset, 30);

      for (const update of updates) {
        // Update offset to acknowledge this update
        offset = update.update_id + 1;

        // Process callback query (inline button press)
        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const telegramId = callbackQuery.from.id;
          const chatId = callbackQuery.message?.chat.id;
          const username = callbackQuery.from.username;
          const firstName = callbackQuery.from.first_name;
          const lastName = callbackQuery.from.last_name;

          console.log(`[Telegram Bot] Received callback query from ${chatId}: ${callbackQuery.data}`);

          // Handle "get_new_code" button press
          if (callbackQuery.data === 'get_new_code' && chatId) {
            // Answer callback query immediately (acknowledge button press)
            await answerCallbackQuery(callbackQuery.id, '🔄 Генерирую новый код...');

            // Generate and send new code
            await processStartCommand(telegramId, chatId, username, firstName, lastName);
          }
        }

        // Process message
        if (update.message) {
          const telegramId = update.message.from.id;
          const chatId = update.message.chat.id;
          const username = update.message.from.username;
          const firstName = update.message.from.first_name;
          const lastName = update.message.from.last_name;

          // Handle text messages
          if (update.message.text) {
            const text = update.message.text;
            console.log(`[Telegram Bot] Received message from ${chatId}: ${text}`);

            // Handle /start command
            if (text.startsWith('/start')) {
              await processStartCommand(telegramId, chatId, username, firstName, lastName);
            }

            // Handle /reset_password command
            if (text.startsWith('/reset_password')) {
              await processResetPasswordCommand(telegramId, chatId, firstName);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Telegram Bot] Error in polling loop:', error);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export function stopTelegramBot(): void {
  console.log('[Telegram Bot] Stopping bot...');
  isRunning = false;
}
