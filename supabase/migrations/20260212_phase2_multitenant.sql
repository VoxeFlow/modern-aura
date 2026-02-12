-- AURA Phase 2 - Multi-tenant foundation
-- Execute in Supabase SQL editor (production and preview as needed)

create extension if not exists pgcrypto;

create table if not exists public.tenants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'agent' check (role in ('owner','admin','agent','viewer')),
    status text not null default 'active' check (status in ('active','invited','disabled')),
    created_at timestamptz not null default now(),
    unique (tenant_id, user_id)
);

-- Optional tenant-scoped profile
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.user_profiles enable row level security;

-- Membership visibility: user sees only his memberships.
drop policy if exists tenant_memberships_select_own on public.tenant_memberships;
create policy tenant_memberships_select_own
on public.tenant_memberships
for select
to authenticated
using (user_id = auth.uid());

-- Membership insert/update only by tenant owner/admin (future admin tooling).
drop policy if exists tenant_memberships_manage_by_owner on public.tenant_memberships;
create policy tenant_memberships_manage_by_owner
on public.tenant_memberships
for all
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = tenant_memberships.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
          and tm.status = 'active'
    )
)
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = tenant_memberships.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
          and tm.status = 'active'
    )
);

-- Tenant visibility only if member.
drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member
on public.tenants
for select
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = tenants.id
          and tm.user_id = auth.uid()
          and tm.status = 'active'
    )
);

-- Tenant creation by authenticated users (owner_user_id must be auth.uid()).
drop policy if exists tenants_insert_owner on public.tenants;
create policy tenants_insert_owner
on public.tenants
for insert
to authenticated
with check (owner_user_id = auth.uid());

-- Tenant update only by owner/admin member.
drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_update_owner
on public.tenants
for update
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = tenants.id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
          and tm.status = 'active'
    )
);

-- User profile policies.
drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists user_profiles_upsert_own on public.user_profiles;
create policy user_profiles_upsert_own
on public.user_profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Helpful indexes
create index if not exists idx_tenant_memberships_user on public.tenant_memberships(user_id, status);
create index if not exists idx_tenant_memberships_tenant on public.tenant_memberships(tenant_id, status);

