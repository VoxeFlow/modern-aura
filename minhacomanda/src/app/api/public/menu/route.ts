import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/http";
import { qrTokenSchema } from "@/lib/validation";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const parsed = qrTokenSchema.safeParse(request.nextUrl.searchParams.get("qrToken"));

    if (!parsed.success) {
      return fail("qrToken inválido", 400, parsed.error.flatten());
    }

    const supabase = getSupabaseServiceClient();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, number, qr_token, restaurant_id, active")
      .eq("qr_token", parsed.data)
      .eq("active", true)
      .single();

    if (tableError || !table) {
      return fail("Mesa não encontrada", 404);
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, pix_provider, pix_key, status")
      .eq("id", table.restaurant_id)
      .single();

    if (restaurantError || !restaurant || restaurant.status !== "active") {
      return fail("Restaurante indisponível", 404);
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, restaurant_id, name, sort_order, active, created_at")
      .eq("restaurant_id", table.restaurant_id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (categoriesError) {
      console.error("[menu] categories error", categoriesError);
      return fail("Falha ao carregar categorias", 500);
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        "id, restaurant_id, category_id, name, description, price_cents, active, image_url, created_at",
      )
      .eq("restaurant_id", table.restaurant_id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (productsError) {
      console.error("[menu] products error", productsError);
      return fail("Falha ao carregar produtos", 500);
    }

    return ok({
      restaurant,
      table: {
        id: table.id,
        number: table.number,
        qr_token: table.qr_token,
      },
      categories: categories || [],
      products: products || [],
    });
  } catch (error) {
    console.error("[menu] unexpected", error);
    return fail("Erro interno", 500);
  }
}
