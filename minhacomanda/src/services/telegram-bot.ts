import { getTelegramEnv } from "@/lib/env";
import { formatCurrency, nowTime } from "@/lib/format";

type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};

type TelegramInlineKeyboard = TelegramInlineKeyboardButton[][];

export class TelegramBotService {
  private readonly token: string;

  constructor(token?: string) {
    this.token = token ?? getTelegramEnv().token;
  }

  isConfigured() {
    return Boolean(this.token);
  }

  private async callApi<T>(method: string, body: Record<string, unknown>) {
    if (!this.token) {
      throw new Error("Telegram bot token não configurado");
    }

    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram API ${method} falhou: ${text}`);
    }

    return (await response.json()) as T;
  }

  async sendMessage({
    chatId,
    text,
    inlineKeyboard,
  }: {
    chatId: string;
    text: string;
    inlineKeyboard?: TelegramInlineKeyboard;
  }) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }

    return this.callApi("sendMessage", payload);
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.callApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  }

  async editMessageText({
    chatId,
    messageId,
    text,
    inlineKeyboard,
  }: {
    chatId: string;
    messageId: number;
    text: string;
    inlineKeyboard?: TelegramInlineKeyboard;
  }) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    };

    if (inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }

    return this.callApi("editMessageText", payload);
  }
}

export function buildTelegramOrderMessage({
  tableNumber,
  restaurantName,
  customerName,
  items,
  totalCents,
  statusLabel,
}: {
  tableNumber: number;
  restaurantName: string;
  customerName?: string | null;
  items: Array<{ qty: number; productName: string; note?: string | null }>;
  totalCents: number;
  statusLabel: string;
}) {
  const lines = items.map((item) => {
    const note = item.note ? ` (${item.note})` : "";
    return `- ${item.qty}x ${item.productName}${note}`;
  });

  return [
    `📍 <b>${restaurantName}</b> | Mesa ${tableNumber} | 🕒 ${nowTime()}`,
    customerName ? `Cliente: ${customerName}` : null,
    "",
    "<b>Itens:</b>",
    ...lines,
    "",
    `Total: <b>${formatCurrency(totalCents)}</b>`,
    `Status: <b>${statusLabel}</b>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildTelegramWaiterCallMessage({
  tableNumber,
  restaurantName,
  typeLabel,
  message,
}: {
  tableNumber: number;
  restaurantName: string;
  typeLabel: string;
  message?: string | null;
}) {
  return [
    `📣 <b>${restaurantName}</b> | Mesa ${tableNumber} | 🕒 ${nowTime()}`,
    `Chamado: <b>${typeLabel}</b>`,
    message ? `Mensagem: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOrderStatusInlineKeyboard(orderId: string): TelegramInlineKeyboard {
  return [
    [
      {
        text: "CONFIRMAR",
        callback_data: `order:${orderId}:confirmed`,
      },
      {
        text: "PREPARO",
        callback_data: `order:${orderId}:preparing`,
      },
    ],
    [
      {
        text: "ENTREGUE",
        callback_data: `order:${orderId}:delivered`,
      },
      {
        text: "CANCELAR",
        callback_data: `order:${orderId}:canceled`,
      },
    ],
  ];
}
