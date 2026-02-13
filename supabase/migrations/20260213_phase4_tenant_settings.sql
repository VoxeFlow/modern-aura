-- AURA Phase 4 - Shared tenant settings (cross-device consistency)
-- Run this migration in Supabase SQL Editor (Production first, then Preview if used).

create extension if not exists pgcrypto;

create table if not exists public.tenant_settings (
    tenant_id uuid primary key references public.tenants(id) on delete cascade,
    briefing text not null default '',
    knowledge_base jsonb not null default '[]'::jsonb,
    manager_phone text not null default '',
    api_url text not null default '',
    api_key text not null default '',
    onboarding_completed boolean not null default false,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_tenant_settings_updated_at on public.tenant_settings;
create trigger trg_tenant_settings_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

alter table public.tenant_settings enable row level security;

drop policy if exists tenant_settings_select_member on public.tenant_settings;
create policy tenant_settings_select_member
on public.tenant_settings
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists tenant_settings_insert_editor on public.tenant_settings;
create policy tenant_settings_insert_editor
on public.tenant_settings
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists tenant_settings_update_editor on public.tenant_settings;
create policy tenant_settings_update_editor
on public.tenant_settings
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists tenant_settings_delete_admin on public.tenant_settings;
create policy tenant_settings_delete_admin
on public.tenant_settings
for delete to authenticated
using (public.is_tenant_admin(tenant_id));
