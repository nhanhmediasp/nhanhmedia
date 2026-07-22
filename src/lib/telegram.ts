import { prisma } from '@/lib/db';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: any;
}

export interface SendPhotoOptions {
  chatId: string | number;
  photoUrl: string;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: any;
}

/**
 * Get active Telegram Bot Token (Prioritize DB WebsiteSettings over .env)
 */
export async function getTelegramToken(): Promise<string | null> {
  try {
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.telegramBotToken && settings.telegramBotToken.trim()) {
      return settings.telegramBotToken.trim();
    }
  } catch (err) {
    console.error('[Telegram] Error reading settings from DB:', err);
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }

  return null;
}

/**
 * Send text message to a Telegram chat
 */
export async function sendTelegramMessage(options: SendMessageOptions): Promise<boolean> {
  const token = await getTelegramToken();
  if (!token) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not configured in .env or database.');
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: options.chatId,
        text: options.text,
        parse_mode: options.parseMode || 'HTML',
        reply_markup: options.replyMarkup,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] sendTelegramMessage failed:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] sendTelegramMessage error:', error);
    return false;
  }
}

/**
 * Send photo (e.g., SePay VietQR image) with caption to Telegram chat
 */
export async function sendTelegramPhoto(options: SendPhotoOptions): Promise<boolean> {
  const token = await getTelegramToken();
  if (!token) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not configured in .env or database.');
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: options.chatId,
        photo: options.photoUrl,
        caption: options.caption || '',
        parse_mode: options.parseMode || 'HTML',
        reply_markup: options.replyMarkup,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] sendTelegramPhoto failed:', err, '- Fallback to text message...');
      
      // Fallback: Send text message if photo fails
      return await sendTelegramMessage({
        chatId: options.chatId,
        text: options.caption ? `${options.caption}\n\n🔗 <b>Mã QR VietQR:</b> ${options.photoUrl}` : options.photoUrl,
        parseMode: options.parseMode,
        replyMarkup: options.replyMarkup,
      });
    }

    return true;
  } catch (error) {
    console.error('[Telegram] sendTelegramPhoto error:', error, '- Fallback to text message...');
    return await sendTelegramMessage({
      chatId: options.chatId,
      text: options.caption ? `${options.caption}\n\n🔗 <b>Mã QR VietQR:</b> ${options.photoUrl}` : options.photoUrl,
      parseMode: options.parseMode,
      replyMarkup: options.replyMarkup,
    });
  }
}

/**
 * Answer Telegram callback query (for inline keyboard interactions)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
  const token = await getTelegramToken();
  if (!token) return false;

  try {
    await fetch(`${TELEGRAM_API_BASE}${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
    return true;
  } catch (error) {
    console.error('[Telegram] answerCallbackQuery error:', error);
    return false;
  }
}
