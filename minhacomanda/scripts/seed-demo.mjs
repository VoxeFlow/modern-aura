import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const restaurantId = "11111111-1111-1111-1111-111111111111";

async function run() {
  const { error: restaurantError } = await supabase.from("restaurants").upsert(
    {
      id: restaurantId,
      name: "Restaurante Demo",
      slug: "demo",
      plan: "starter",
      status: "active",
      pix_provider: "disabled",
      pix_key: "11999999999",
    },
    { onConflict: "id" },
  );

  if (restaurantError) throw restaurantError;

  const { error: tablesError } = await supabase.from("tables").upsert(
    [
      {
        id: "21111111-1111-1111-1111-111111111111",
        restaurant_id: restaurantId,
        number: 1,
        qr_token: "demo-table-1",
        active: true,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        restaurant_id: restaurantId,
        number: 2,
        qr_token: "demo-table-2",
        active: true,
      },
      {
        id: "23333333-3333-3333-3333-333333333333",
        restaurant_id: restaurantId,
        number: 3,
        qr_token: "demo-table-3",
        active: true,
      },
    ],
    { onConflict: "id" },
  );

  if (tablesError) throw tablesError;

  const { error: categoriesError } = await supabase.from("categories").upsert(
    [
      {
        id: "31111111-1111-1111-1111-111111111111",
        restaurant_id: restaurantId,
        name: "Bebidas",
        sort_order: 1,
        active: true,
      },
      {
        id: "32222222-2222-2222-2222-222222222222",
        restaurant_id: restaurantId,
        name: "Lanches",
        sort_order: 2,
        active: true,
      },
    ],
    { onConflict: "id" },
  );

  if (categoriesError) throw categoriesError;

  const { error: productsError } = await supabase.from("products").upsert(
    [
      {
        id: "41111111-1111-1111-1111-111111111111",
        restaurant_id: restaurantId,
        category_id: "31111111-1111-1111-1111-111111111111",
        name: "Água sem gás",
        description: "Garrafa 500ml",
        price_cents: 500,
        active: true,
      },
      {
        id: "42222222-2222-2222-2222-222222222222",
        restaurant_id: restaurantId,
        category_id: "31111111-1111-1111-1111-111111111111",
        name: "Refrigerante lata",
        description: "350ml",
        price_cents: 750,
        active: true,
      },
      {
        id: "43333333-3333-3333-3333-333333333333",
        restaurant_id: restaurantId,
        category_id: "31111111-1111-1111-1111-111111111111",
        name: "Suco natural",
        description: "Laranja ou limão",
        price_cents: 1200,
        active: true,
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        restaurant_id: restaurantId,
        category_id: "32222222-2222-2222-2222-222222222222",
        name: "X-Burger",
        description: "Pão, carne e queijo",
        price_cents: 2400,
        active: true,
      },
      {
        id: "45555555-5555-5555-5555-555555555555",
        restaurant_id: restaurantId,
        category_id: "32222222-2222-2222-2222-222222222222",
        name: "X-Salada",
        description: "Pão, carne, queijo e salada",
        price_cents: 2700,
        active: true,
      },
      {
        id: "46666666-6666-6666-6666-666666666666",
        restaurant_id: restaurantId,
        category_id: "32222222-2222-2222-2222-222222222222",
        name: "Batata frita",
        description: "Porção média",
        price_cents: 1800,
        active: true,
      },
    ],
    { onConflict: "id" },
  );

  if (productsError) throw productsError;

  console.log("Seed demo aplicado com sucesso.");
}

run().catch((error) => {
  console.error("Falha ao aplicar seed:", error.message ?? error);
  process.exit(1);
});
