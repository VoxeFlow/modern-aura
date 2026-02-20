import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getOrderSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const parsed = getOrderSchema.safeParse({
      qrToken: request.nextUrl.searchParams.get("qrToken"),
      orderId: request.nextUrl.searchParams.get("orderId"),
    });

    if (!parsed.success) {
      return fail("Parâmetros inválidos", 400, parsed.error.flatten());
    }

    const { qrToken, orderId } = parsed.data;

    const supabase = getSupabaseServiceClient();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, number, restaurant_id")
      .eq("qr_token", qrToken)
      .single();

    if (tableError || !table) {
      return fail("Mesa não encontrada", 404);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, restaurant_id, table_id, customer_name, status, total_cents, payment_status, pix_charge_id, created_at, updated_at",
      )
      .eq("id", orderId)
      .eq("table_id", table.id)
      .single();

    if (orderError || !order) {
      return fail("Pedido não encontrado", 404);
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, qty, note, price_cents, created_at, products(name)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("[order/get] items", itemsError);
      return fail("Falha ao carregar itens do pedido", 500);
    }

    const { data: events } = await supabase
      .from("order_events")
      .select("id, from_status, to_status, source, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return ok({
      table,
      order,
      items: items || [],
      events: events || [],
    });
  } catch (error) {
    console.error("[order/get] unexpected", error);
    return fail("Erro interno", 500);
  }
}
