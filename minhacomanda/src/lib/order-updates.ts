import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderStatus } from "@/types/domain";

export async function updateOrderStatusAndLog({
  supabase,
  orderId,
  toStatus,
  source,
}: {
  supabase: SupabaseClient;
  orderId: string;
  toStatus: OrderStatus;
  source: "telegram" | "admin" | "system";
}) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Pedido não encontrado");
  }

  const fromStatus = order.status as string;

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: toStatus })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
    source,
  });

  if (eventError) {
    throw new Error(eventError.message);
  }
}
