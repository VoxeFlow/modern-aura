begin;

insert into public.restaurants (
  id,
  name,
  slug,
  plan,
  status,
  telegram_chat_id,
  pix_provider,
  pix_key
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Restaurante Demo',
  'demo',
  'starter',
  'active',
  null,
  'disabled',
  '11999999999'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  plan = excluded.plan,
  status = excluded.status,
  pix_provider = excluded.pix_provider,
  pix_key = excluded.pix_key;

insert into public.tables (id, restaurant_id, number, qr_token, active)
values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'demo-table-1', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'demo-table-2', true),
  ('23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 3, 'demo-table-3', true)
on conflict (id) do nothing;

insert into public.categories (id, restaurant_id, name, sort_order, active)
values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Bebidas', 1, true),
  ('32222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Lanches', 2, true)
on conflict (id) do nothing;

insert into public.products (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price_cents,
  active,
  image_url
)
values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Água sem gás', 'Garrafa 500ml', 500, true, null),
  ('42222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Refrigerante lata', '350ml', 750, true, null),
  ('43333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Suco natural', 'Laranja ou limão', 1200, true, null),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '32222222-2222-2222-2222-222222222222', 'X-Burger', 'Pão, carne e queijo', 2400, true, null),
  ('45555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '32222222-2222-2222-2222-222222222222', 'X-Salada', 'Pão, carne, queijo e salada', 2700, true, null),
  ('46666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '32222222-2222-2222-2222-222222222222', 'Batata frita', 'Porção média', 1800, true, null)
on conflict (id) do nothing;

commit;
