import { z } from "zod";

import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { getTelegramEnv } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { updateOrderStatusAndLog } from "@/lib/order-updates";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { TelegramBotService } from "@/services/telegram-bot";

const callbackDataSchema = z.object({
  orderId: z.uuid(),
  toStatus: z.enum(["confirmed", "preparing", "delivered", "canceled"]),
});

function parseCallbackData(data: string) {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== "order") {
    return null;
  }

  const parsed = callbackDataSchema.safeParse({
    orderId: parts[1],
    toStatus: parts[2],
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function POST(request: Request) {
  try {
    const { webhookSecret } = getTelegramEnv();

    if (webhookSecret) {
      const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (receivedSecret !== webhookSecret) {
        return fail("Secret do webhook inválido", 401);
      }
    }

    const update = (await request.json()) as {
      callback_query?: {
        id: string;
        data?: string;
        message?: {
          chat?: { id?: number };
          message_id?: number;
          text?: string;
        };
      };
    };

    const callbackQuery = update.callback_query;
    if (!callbackQuery?.data) {
      return ok({ ignored: true, reason: "Sem callback_data" });
    }

    const parsedCallback = parseCallbackData(callbackQuery.data);
    const telegram = new TelegramBotService();

    if (!parsedCallback) {
      if (telegram.isConfigured()) {
        await telegram.answerCallbackQuery(callbackQuery.id, "Ação inválida");
      }
      return ok({ ignored: true, reason: "Callback inválido" });
    }

    const supabase = getSupabaseServiceClient();

    await updateOrderStatusAndLog({
      supabase,
      orderId: parsedCallback.orderId,
      toStatus: parsedCallback.toStatus,
      source: "telegram",
    });

    if (telegram.isConfigured()) {
      await telegram.answerCallbackQuery(
        callbackQuery.id,
        `Pedido atualizado: ${ORDER_STATUS_LABELS[parsedCallback.toStatus]}`,
      );

      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;
      const originalText = callbackQuery.message?.text;

      if (chatId && messageId && originalText) {
        const nextText = `${originalText}\n\n✅ Status atualizado para ${ORDER_STATUS_LABELS[parsedCallback.toStatus]}`;

        await telegram.editMessageText({
          chatId: String(chatId),
          messageId,
          text: nextText,
        });
      }
    }

    return ok({ processed: true, orderId: parsedCallback.orderId, toStatus: parsedCallback.toStatus });
  } catch (error) {
    console.error("[telegram/webhook] unexpected", error);

    if (error instanceof Error) {
      return fail(error.message, 400);
    }

    return fail("Erro interno", 500);
  }
}
