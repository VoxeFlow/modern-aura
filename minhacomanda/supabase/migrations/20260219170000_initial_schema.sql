begin;

create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  status text not null default 'active' check (status in ('active', 'inactive')),
  telegram_chat_id text,
  pix_provider text not null default 'disabled' check (pix_provider in ('mercadopago', 'disabled')),
  pix_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  auth_user_id uuid not null unique,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number integer not null,
  qr_token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete restrict,
  customer_name text,
  status text not null default 'awaiting' check (status in ('awaiting', 'confirmed', 'preparing', 'delivered', 'closed', 'canceled')),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid')),
  pix_charge_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0),
  note text,
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete restrict,
  type text not null check (type in ('waiter', 'bill', 'other')),
  message text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  source text not null check (source in ('telegram', 'admin', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_restaurant_id on public.admin_users (restaurant_id);
create index if not exists idx_admin_users_auth_user_id on public.admin_users (auth_user_id);
create index if not exists idx_tables_restaurant_id on public.tables (restaurant_id);
create index if not exists idx_tables_qr_token on public.tables (qr_token);
create index if not exists idx_categories_restaurant_id on public.categories (restaurant_id);
create index if not exists idx_products_restaurant_id on public.products (restaurant_id);
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_orders_restaurant_id on public.orders (restaurant_id);
create index if not exists idx_orders_table_id on public.orders (table_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_pix_charge_id on public.orders (pix_charge_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);
create index if not exists idx_waiter_calls_restaurant_id on public.waiter_calls (restaurant_id);
create index if not exists idx_waiter_calls_table_id on public.waiter_calls (table_id);
create index if not exists idx_waiter_calls_status on public.waiter_calls (status);
create index if not exists idx_order_events_order_id on public.order_events (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists trg_waiter_calls_set_updated_at on public.waiter_calls;
create trigger trg_waiter_calls_set_updated_at
before update on public.waiter_calls
for each row
execute function public.set_updated_at();

create or replace function public.is_restaurant_admin(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.restaurant_id = target_restaurant_id
      and au.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_restaurant_admin(uuid) from public;
grant execute on function public.is_restaurant_admin(uuid) to authenticated;

alter table public.restaurants enable row level security;
alter table public.admin_users enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.waiter_calls enable row level security;
alter table public.order_events enable row level security;

create policy "restaurants_admin_select"
on public.restaurants
for select
to authenticated
using (public.is_restaurant_admin(id));

create policy "restaurants_admin_update"
on public.restaurants
for update
to authenticated
using (public.is_restaurant_admin(id))
with check (public.is_restaurant_admin(id));

create policy "admin_users_self_select"
on public.admin_users
for select
to authenticated
using (auth_user_id = auth.uid());

create policy "tables_admin_all"
on public.tables
for all
to authenticated
using (public.is_restaurant_admin(restaurant_id))
with check (public.is_restaurant_admin(restaurant_id));

create policy "categories_admin_all"
on public.categories
for all
to authenticated
using (public.is_restaurant_admin(restaurant_id))
with check (public.is_restaurant_admin(restaurant_id));

create policy "products_admin_all"
on public.products
for all
to authenticated
using (public.is_restaurant_admin(restaurant_id))
with check (public.is_restaurant_admin(restaurant_id));

create policy "orders_admin_all"
on public.orders
for all
to authenticated
using (public.is_restaurant_admin(restaurant_id))
with check (public.is_restaurant_admin(restaurant_id));

create policy "order_items_admin_all"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and public.is_restaurant_admin(o.restaurant_id)
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and public.is_restaurant_admin(o.restaurant_id)
  )
);

create policy "waiter_calls_admin_all"
on public.waiter_calls
for all
to authenticated
using (public.is_restaurant_admin(restaurant_id))
with check (public.is_restaurant_admin(restaurant_id));

create policy "order_events_admin_all"
on public.order_events
for all
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and public.is_restaurant_admin(o.restaurant_id)
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and public.is_restaurant_admin(o.restaurant_id)
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'waiter_calls'
  ) then
    alter publication supabase_realtime add table public.waiter_calls;
  end if;
end
$$;

commit;
