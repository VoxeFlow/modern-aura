import { getAppBaseUrl } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { pixCreateChargeSchema } from "@/lib/validation";
import { buildPixProvider } from "@/services/pix";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = pixCreateChargeSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Payload inválido", 400, parsed.error.flatten());
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
      .select("id, table_id, total_cents, payment_status, status, customer_name")
      .eq("id", orderId)
      .eq("table_id", table.id)
      .single();

    if (orderError || !order) {
      return fail("Pedido não encontrado", 404);
    }

    if (order.payment_status === "paid") {
      return ok({
        alreadyPaid: true,
        message: "Pedido já está pago.",
      });
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, pix_provider, pix_key")
      .eq("id", table.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return fail("Restaurante não encontrado", 404);
    }

    const provider = buildPixProvider(restaurant.pix_key);

    const result = await provider.createCharge({
      orderId: order.id,
      amountCents: order.total_cents,
      description: `Pedido mesa ${table.number} - ${restaurant.name}`,
      customerName: order.customer_name,
      notificationUrl: `${getAppBaseUrl()}/api/pix/webhook`,
    });

    if (result.mode === "provider" && result.chargeId) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          pix_charge_id: result.chargeId,
          payment_status: "pending",
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[pix/create-charge] update", updateError);
      }
    }

    return ok({
      orderId: order.id,
      totalCents: order.total_cents,
      paymentStatus: result.mode === "provider" ? "pending" : order.payment_status,
      pix: result,
    });
  } catch (error) {
    console.error("[pix/create-charge] unexpected", error);

    if (error instanceof Error) {
      return fail(error.message, 400);
    }

    return fail("Erro interno", 500);
  }
}
