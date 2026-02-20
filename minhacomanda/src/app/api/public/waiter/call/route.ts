import { WAITER_CALL_TYPE_LABELS } from "@/lib/constants";
import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { waiterCallSchema } from "@/lib/validation";
import { buildTelegramWaiterCallMessage, TelegramBotService } from "@/services/telegram-bot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = waiterCallSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Payload inválido", 400, parsed.error.flatten());
    }

    const { qrToken, type, message } = parsed.data;
    const supabase = getSupabaseServiceClient();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, number, restaurant_id")
      .eq("qr_token", qrToken)
      .single();

    if (tableError || !table) {
      return fail("Mesa não encontrada", 404);
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("name, telegram_chat_id")
      .eq("id", table.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return fail("Restaurante não encontrado", 404);
    }

    const { data: waiterCall, error: waiterCallError } = await supabase
      .from("waiter_calls")
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        type,
        message: message || null,
        status: "open",
      })
      .select("id, status, created_at")
      .single();

    if (waiterCallError || !waiterCall) {
      console.error("[waiter/call] insert", waiterCallError);
      return fail("Falha ao criar chamado", 500);
    }

    if (restaurant.telegram_chat_id) {
      const telegram = new TelegramBotService();

      if (telegram.isConfigured()) {
        try {
          await telegram.sendMessage({
            chatId: restaurant.telegram_chat_id,
            text: buildTelegramWaiterCallMessage({
              tableNumber: table.number,
              restaurantName: restaurant.name,
              typeLabel: WAITER_CALL_TYPE_LABELS[type],
              message,
            }),
          });
        } catch (telegramError) {
          console.error("[waiter/call] telegram", telegramError);
        }
      }
    }

    return ok(
      {
        waiterCallId: waiterCall.id,
        status: waiterCall.status,
        createdAt: waiterCall.created_at,
      },
      201,
    );
  } catch (error) {
    console.error("[waiter/call] unexpected", error);
    return fail("Erro interno", 500);
  }
}
