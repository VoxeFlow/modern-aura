import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { buildWebhookPixProvider } from "@/services/pix";

export async function POST(request: Request) {
  try {
    const provider = buildWebhookPixProvider();
    if (!provider) {
      return ok({ ignored: true, reason: "Pix provider desabilitado" });
    }

    const rawBody = await request.text();
    const result = await provider.resolveWebhook(rawBody, request.headers);

    if (!result) {
      return ok({ ignored: true, reason: "Evento sem pagamento" });
    }

    if (!result.approved) {
      return ok({ processed: true, approved: false, chargeId: result.chargeId });
    }

    const supabase = getSupabaseServiceClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("pix_charge_id", result.chargeId)
      .single();

    if (orderError || !order) {
      console.error("[pix/webhook] order not found", orderError);
      return ok({ processed: true, approved: true, orderFound: false, chargeId: result.chargeId });
    }

    if (order.payment_status === "paid") {
      return ok({ processed: true, approved: true, alreadyPaid: true, orderId: order.id });
    }

    const targetStatus = order.status === "closed" ? "closed" : "closed";

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: targetStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("[pix/webhook] update", updateError);
      return fail("Falha ao atualizar pagamento", 500);
    }

    const { error: eventError } = await supabase.from("order_events").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: targetStatus,
      source: "system",
    });

    if (eventError) {
      console.error("[pix/webhook] order_events", eventError);
    }

    return ok({ processed: true, approved: true, orderId: order.id });
  } catch (error) {
    console.error("[pix/webhook] unexpected", error);

    if (error instanceof Error) {
      return fail(error.message, 401);
    }

    return fail("Erro interno", 500);
  }
}
