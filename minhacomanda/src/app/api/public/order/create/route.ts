import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { fail, ok } from "@/lib/http";
import { calculateOrderTotal } from "@/lib/order";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createOrderSchema } from "@/lib/validation";
import {
  buildOrderStatusInlineKeyboard,
  buildTelegramOrderMessage,
  TelegramBotService,
} from "@/services/telegram-bot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Payload inválido", 400, parsed.error.flatten());
    }

    const { qrToken, customerName, items } = parsed.data;

    const supabase = getSupabaseServiceClient();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, number, restaurant_id, active")
      .eq("qr_token", qrToken)
      .eq("active", true)
      .single();

    if (tableError || !table) {
      return fail("Mesa inválida", 404);
    }

    const productIds = items.map((item) => item.productId);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price_cents, active")
      .eq("restaurant_id", table.restaurant_id)
      .in("id", productIds)
      .eq("active", true);

    if (productsError) {
      console.error("[order/create] products", productsError);
      return fail("Falha ao validar itens", 500);
    }

    const productMap = new Map((products || []).map((product) => [product.id, product]));

    const missingProduct = items.find((item) => !productMap.has(item.productId));
    if (missingProduct) {
      return fail("Item do pedido não encontrado ou inativo", 400);
    }

    const calculatedItems = items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Produto não encontrado para cálculo");
      }

      return {
        productId: item.productId,
        qty: item.qty,
        note: item.note,
        unitPriceCents: product.price_cents,
        productName: product.name,
      };
    });

    const totalCents = calculateOrderTotal(
      calculatedItems.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
      })),
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        customer_name: customerName || null,
        status: "awaiting",
        total_cents: totalCents,
        payment_status: "unpaid",
      })
      .select("id, status, total_cents, created_at")
      .single();

    if (orderError || !order) {
      console.error("[order/create] order", orderError);
      return fail("Falha ao criar pedido", 500);
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      calculatedItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        qty: item.qty,
        note: item.note || null,
        price_cents: item.unitPriceCents,
      })),
    );

    if (itemsError) {
      console.error("[order/create] order_items", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      return fail("Falha ao registrar itens", 500);
    }

    const { error: eventError } = await supabase.from("order_events").insert({
      order_id: order.id,
      from_status: null,
      to_status: "awaiting",
      source: "system",
    });

    if (eventError) {
      console.error("[order/create] order_events", eventError);
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, telegram_chat_id")
      .eq("id", table.restaurant_id)
      .single();

    if (restaurant?.telegram_chat_id) {
      const telegram = new TelegramBotService();
      if (telegram.isConfigured()) {
        const message = buildTelegramOrderMessage({
          tableNumber: table.number,
          restaurantName: restaurant.name,
          customerName,
          items: calculatedItems.map((item) => ({
            qty: item.qty,
            productName: item.productName,
            note: item.note,
          })),
          totalCents,
          statusLabel: ORDER_STATUS_LABELS.awaiting,
        });

        try {
          await telegram.sendMessage({
            chatId: restaurant.telegram_chat_id,
            text: message,
            inlineKeyboard: buildOrderStatusInlineKeyboard(order.id),
          });
        } catch (telegramError) {
          console.error("[order/create] telegram", telegramError);
        }
      }
    }

    return ok({
      orderId: order.id,
      status: order.status,
      totalCents: order.total_cents,
      createdAt: order.created_at,
    }, 201);
  } catch (error) {
    console.error("[order/create] unexpected", error);
    return fail("Erro interno", 500);
  }
}
