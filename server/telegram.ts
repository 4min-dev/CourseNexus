import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { objectStorage } from './objectStorage';
import { fetchObject } from './bunnyStorage';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_API = 'https://api.telegram.org/bot';

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN not found in environment variables');
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
  contact?: TelegramContact;
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/**
 * Send a message to a Telegram user via bot
 */
export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot send message: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await axios.post(url, payload);

    if (response.data.ok) {
      console.log(`[Telegram Bot] Message sent to chat_id ${chatId}`);
      return true;
    } else {
      console.error('[Telegram Bot] Failed to send message:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error sending message:', error);
    return false;
  }
}

/**
 * Send a photo with caption to a Telegram user
 */
export async function sendTelegramPhoto(chatId: string | number, photoPath: string, caption?: string, replyMarkup?: any): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot send photo: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const form = new FormData();

    const absolutePath = resolve(photoPath);
    form.append('chat_id', chatId.toString());
    form.append('photo', createReadStream(absolutePath));

    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    if (replyMarkup) {
      form.append('reply_markup', JSON.stringify(replyMarkup));
    }

    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
    });

    if (response.data.ok) {
      console.log(`[Telegram Bot] Photo sent to chat_id ${chatId}`);
      return true;
    } else {
      console.error('[Telegram Bot] Failed to send photo:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error sending photo:', error);
    return false;
  }
}

/**
 * Send a message with a keyboard button to request contact (REQUIRED)
 */
export async function sendMessageWithContactRequest(chatId: number, text: string): Promise<boolean> {
  const replyMarkup = {
    keyboard: [
      [
        {
          text: "📱 Поделиться контактом",
          request_contact: true,
        }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  return sendTelegramMessage(chatId, text, replyMarkup);
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Set webhook URL for Telegram bot
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot set webhook: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const response = await axios.post(url, {
      url: webhookUrl,
    });

    if (response.data.ok) {
      console.log(`[Telegram Bot] Webhook set to: ${webhookUrl}`);
      return true;
    } else {
      console.error('[Telegram Bot] Failed to set webhook:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error setting webhook:', error);
    return false;
  }
}

/**
 * Get webhook info
 */
export async function getTelegramWebhookInfo(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot get webhook info: TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('[Telegram Bot] Error getting webhook info:', error);
    return null;
  }
}

/**
 * Delete webhook (use polling mode instead)
 */
export async function deleteTelegramWebhook(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot delete webhook: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/deleteWebhook`;
    const response = await axios.post(url);

    if (response.data.ok) {
      console.log('[Telegram Bot] Webhook deleted');
      return true;
    } else {
      console.error('[Telegram Bot] Failed to delete webhook:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error deleting webhook:', error);
    return false;
  }
}

/**
 * Get updates using long polling
 */
export async function getUpdates(offset?: number, timeout: number = 30): Promise<TelegramUpdate[]> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot get updates: TELEGRAM_BOT_TOKEN not configured');
    return [];
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const params: any = {
      timeout,
      allowed_updates: ['message', 'callback_query'],
    };

    if (offset !== undefined) {
      params.offset = offset;
    }

    const response = await axios.post(url, params);

    if (response.data.ok) {
      return response.data.result;
    } else {
      console.error('[Telegram Bot] Failed to get updates:', response.data);
      return [];
    }
  } catch (error) {
    console.error('[Telegram Bot] Error getting updates:', error);
    return [];
  }
}

/**
 * Answer a callback query (acknowledge button press)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert: boolean = false): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot answer callback query: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const payload: any = {
      callback_query_id: callbackQueryId,
      show_alert: showAlert,
    };

    if (text) {
      payload.text = text;
    }

    const response = await axios.post(url, payload);

    if (response.data.ok) {
      return true;
    } else {
      console.error('[Telegram Bot] Failed to answer callback query:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error answering callback query:', error);
    return false;
  }
}

/**
 * Send a photo from Object Storage with caption to a Telegram user
 */
export async function sendTelegramPhotoByUrl(
  chatId: string | number,
  photoPath: string,
  caption?: string,
  replyMarkup?: any
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram Bot] Cannot send photo: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    // If it's a path to Object Storage, download the file and send it
    if (photoPath.startsWith('/objects/')) {
      console.log(`[Telegram Bot] Downloading photo from Object Storage: ${photoPath}`);

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(photoPath);

      if (!file) {
        console.error('[Telegram Bot] Photo not found in Object Storage:', photoPath);
        return false;
      }

      // Create FormData with file stream
      const form = new FormData();
      form.append('chat_id', chatId.toString());

      const photoResponse = await fetchObject(file.path);
      if (!photoResponse.ok || !photoResponse.body) {
        console.error('[Telegram Bot] Failed to fetch photo from Bunny storage');
        return false;
      }

      const stream = photoResponse.body as any;
      form.append('photo', stream, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      if (caption) {
        form.append('caption', caption);
        form.append('parse_mode', 'HTML');
      }

      if (replyMarkup) {
        form.append('reply_markup', JSON.stringify(replyMarkup));
      }

      const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      const response = await axios.post(url, form, {
        headers: form.getHeaders(),
      });

      if (response.data.ok) {
        console.log(`[Telegram Bot] Photo from Object Storage sent to chat_id ${chatId}`);
        return true;
      } else {
        console.error('[Telegram Bot] Failed to send photo from Object Storage:', response.data);
        return false;
      }
    }

    // Fallback: if it's already a URL, send it as URL
    const url = `${TELEGRAM_BOT_API}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const payload: any = {
      chat_id: chatId,
      photo: photoPath,
    };

    if (caption) {
      payload.caption = caption;
      payload.parse_mode = 'HTML';
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await axios.post(url, payload);

    if (response.data.ok) {
      console.log(`[Telegram Bot] Photo URL sent to chat_id ${chatId}`);
      return true;
    } else {
      console.error('[Telegram Bot] Failed to send photo URL:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error sending photo:', error);
    return false;
  }
}

/**
 * Send notification to Telegram with formatting and optional image
 */
export async function sendNotificationToTelegram(
  chatId: string | number,
  type: string,
  title: string,
  message: string,
  imageUrl?: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  // Icon mapping for different notification types
  const iconMap: Record<string, string> = {
    'purchase_course': '🎓',
    'purchase_package': '📦',
    'purchase_vip': '⭐',
    'sniper_approved': '✅',
    'admin_broadcast': '📢',
    'review_approved': '✅',
    'review_reaction': '👍',
    'purchase_program': '💻',
    'new_lessons': '📚',
  };

  const icon = iconMap[type] || '🔔';

  const formattedMessage = `${icon} <b>${title}</b>\n\n${message}`;

  // If imageUrl is provided, send as photo with caption
  if (imageUrl) {
    return sendTelegramPhotoByUrl(chatId, imageUrl, formattedMessage);
  }

  // Otherwise send as text message
  return sendTelegramMessage(chatId, formattedMessage);
}
