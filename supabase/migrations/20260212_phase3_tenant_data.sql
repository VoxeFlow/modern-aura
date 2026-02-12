-- AURA Phase 3 - Tenant-aware operational data
-- Execute after Phase 2 migration.

create extension if not exists pgcrypto;

-- =========================================================
-- Helper functions for RLS checks
-- =========================================================
create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = target_tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'active'
    );
$$;

create or replace function public.is_tenant_editor(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = target_tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'active'
          and tm.role in ('owner', 'admin', 'agent')
    );
$$;

create or replace function public.is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = target_tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'active'
          and tm.role in ('owner', 'admin')
    );
$$;

grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_tenant_editor(uuid) to authenticated;
grant execute on function public.is_tenant_admin(uuid) to authenticated;

-- =========================================================
-- WhatsApp channels per tenant
-- =========================================================
create table if not exists public.tenant_channels (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    label text not null,
    instance_name text not null,
    status text not null default 'disconnected' check (status in ('disconnected', 'connecting', 'open', 'error')),
    is_primary boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, label),
    unique (tenant_id, instance_name)
);

create unique index if not exists ux_tenant_channels_primary
on public.tenant_channels (tenant_id)
where is_primary = true;

-- =========================================================
-- Contacts (base entity for chat + CRM)
-- =========================================================
create table if not exists public.contacts (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    channel_id uuid references public.tenant_channels(id) on delete set null,
    external_id text,
    jid text,
    phone_e164 text,
    display_name text not null default 'Contato',
    avatar_url text,
    source text not null default 'whatsapp' check (source in ('whatsapp', 'manual', 'import')),
    metadata jsonb not null default '{}'::jsonb,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_contacts_tenant_jid
on public.contacts (tenant_id, jid)
where jid is not null;

create unique index if not exists ux_contacts_tenant_phone
on public.contacts (tenant_id, phone_e164)
where phone_e164 is not null;

create index if not exists idx_contacts_tenant_last_seen
on public.contacts (tenant_id, last_seen_at desc nulls last);

-- =========================================================
-- Conversations (one thread per tenant/contact/channel)
-- =========================================================
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    contact_id uuid not null references public.contacts(id) on delete cascade,
    channel_id uuid references public.tenant_channels(id) on delete set null,
    subject text,
    status text not null default 'open' check (status in ('open', 'pending', 'closed', 'archived')),
    assigned_user_id uuid references auth.users(id) on delete set null,
    tags text[] not null default '{}'::text[],
    last_message_at timestamptz,
    unread_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, contact_id, channel_id)
);

create index if not exists idx_conversations_tenant_last_message
on public.conversations (tenant_id, last_message_at desc nulls last);

create index if not exists idx_conversations_tenant_status
on public.conversations (tenant_id, status);

-- =========================================================
-- Messages
-- =========================================================
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    contact_id uuid not null references public.contacts(id) on delete cascade,
    channel_id uuid references public.tenant_channels(id) on delete set null,
    message_key text,
    direction text not null check (direction in ('incoming', 'outgoing', 'system')),
    kind text not null default 'text' check (kind in ('text', 'audio', 'image', 'video', 'document', 'sticker', 'unknown')),
    body text,
    media_url text,
    raw_payload jsonb not null default '{}'::jsonb,
    sent_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create unique index if not exists ux_messages_tenant_channel_key
on public.messages (tenant_id, channel_id, message_key)
where message_key is not null and channel_id is not null;

create index if not exists idx_messages_tenant_conversation_sent
on public.messages (tenant_id, conversation_id, sent_at desc);

create index if not exists idx_messages_tenant_contact_sent
on public.messages (tenant_id, contact_id, sent_at desc);

-- =========================================================
-- CRM stages + leads
-- =========================================================
create table if not exists public.crm_stages (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    name text not null,
    position integer not null,
    is_default boolean not null default false,
    color text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, name),
    unique (tenant_id, position)
);

create unique index if not exists ux_crm_stages_default
on public.crm_stages (tenant_id)
where is_default = true;

create table if not exists public.crm_leads (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    contact_id uuid not null references public.contacts(id) on delete cascade,
    conversation_id uuid references public.conversations(id) on delete set null,
    stage_id uuid references public.crm_stages(id) on delete set null,
    owner_user_id uuid references auth.users(id) on delete set null,
    title text not null default 'Novo Lead',
    value_cents integer not null default 0,
    temperature text not null default 'warm' check (temperature in ('cold', 'warm', 'hot')),
    confidence smallint not null default 50 check (confidence between 0 and 100),
    status text not null default 'open' check (status in ('open', 'won', 'lost')),
    next_action text,
    next_action_at timestamptz,
    notes text,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, contact_id)
);

create index if not exists idx_crm_leads_tenant_stage
on public.crm_leads (tenant_id, stage_id, status);

create index if not exists idx_crm_leads_tenant_owner
on public.crm_leads (tenant_id, owner_user_id, status);

-- =========================================================
-- AI learning events (accepted edits / wand feedback loop)
-- =========================================================
create table if not exists public.ai_learning_events (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    conversation_id uuid references public.conversations(id) on delete set null,
    channel_id uuid references public.tenant_channels(id) on delete set null,
    source text not null default 'wand' check (source in ('wand', 'suggestion', 'manual', 'system')),
    prompt text,
    ai_output text,
    final_output text,
    accepted boolean not null default false,
    score smallint check (score between 0 and 100),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_ai_learning_events_tenant_created
on public.ai_learning_events (tenant_id, created_at desc);

-- =========================================================
-- Automatic updated_at maintenance
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_tenant_channels_updated_at on public.tenant_channels;
create trigger trg_tenant_channels_updated_at
before update on public.tenant_channels
for each row execute function public.set_updated_at();

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_stages_updated_at on public.crm_stages;
create trigger trg_crm_stages_updated_at
before update on public.crm_stages
for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_leads_updated_at on public.crm_leads;
create trigger trg_crm_leads_updated_at
before update on public.crm_leads
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.tenant_channels enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.crm_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.ai_learning_events enable row level security;

-- tenant_channels
drop policy if exists tenant_channels_select_member on public.tenant_channels;
create policy tenant_channels_select_member
on public.tenant_channels
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists tenant_channels_insert_editor on public.tenant_channels;
create policy tenant_channels_insert_editor
on public.tenant_channels
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists tenant_channels_update_editor on public.tenant_channels;
create policy tenant_channels_update_editor
on public.tenant_channels
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists tenant_channels_delete_admin on public.tenant_channels;
create policy tenant_channels_delete_admin
on public.tenant_channels
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- contacts
drop policy if exists contacts_select_member on public.contacts;
create policy contacts_select_member
on public.contacts
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists contacts_insert_editor on public.contacts;
create policy contacts_insert_editor
on public.contacts
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists contacts_update_editor on public.contacts;
create policy contacts_update_editor
on public.contacts
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists contacts_delete_admin on public.contacts;
create policy contacts_delete_admin
on public.contacts
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- conversations
drop policy if exists conversations_select_member on public.conversations;
create policy conversations_select_member
on public.conversations
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists conversations_insert_editor on public.conversations;
create policy conversations_insert_editor
on public.conversations
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists conversations_update_editor on public.conversations;
create policy conversations_update_editor
on public.conversations
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists conversations_delete_admin on public.conversations;
create policy conversations_delete_admin
on public.conversations
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- messages
drop policy if exists messages_select_member on public.messages;
create policy messages_select_member
on public.messages
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists messages_insert_editor on public.messages;
create policy messages_insert_editor
on public.messages
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists messages_update_editor on public.messages;
create policy messages_update_editor
on public.messages
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists messages_delete_admin on public.messages;
create policy messages_delete_admin
on public.messages
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- crm_stages
drop policy if exists crm_stages_select_member on public.crm_stages;
create policy crm_stages_select_member
on public.crm_stages
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists crm_stages_insert_editor on public.crm_stages;
create policy crm_stages_insert_editor
on public.crm_stages
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists crm_stages_update_editor on public.crm_stages;
create policy crm_stages_update_editor
on public.crm_stages
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists crm_stages_delete_admin on public.crm_stages;
create policy crm_stages_delete_admin
on public.crm_stages
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- crm_leads
drop policy if exists crm_leads_select_member on public.crm_leads;
create policy crm_leads_select_member
on public.crm_leads
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists crm_leads_insert_editor on public.crm_leads;
create policy crm_leads_insert_editor
on public.crm_leads
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists crm_leads_update_editor on public.crm_leads;
create policy crm_leads_update_editor
on public.crm_leads
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists crm_leads_delete_admin on public.crm_leads;
create policy crm_leads_delete_admin
on public.crm_leads
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- ai_learning_events
drop policy if exists ai_learning_events_select_member on public.ai_learning_events;
create policy ai_learning_events_select_member
on public.ai_learning_events
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists ai_learning_events_insert_editor on public.ai_learning_events;
create policy ai_learning_events_insert_editor
on public.ai_learning_events
for insert to authenticated
with check (public.is_tenant_editor(tenant_id));

drop policy if exists ai_learning_events_update_editor on public.ai_learning_events;
create policy ai_learning_events_update_editor
on public.ai_learning_events
for update to authenticated
using (public.is_tenant_editor(tenant_id))
with check (public.is_tenant_editor(tenant_id));

drop policy if exists ai_learning_events_delete_admin on public.ai_learning_events;
create policy ai_learning_events_delete_admin
on public.ai_learning_events
for delete to authenticated
using (public.is_tenant_admin(tenant_id));

-- =========================================================
-- Seed default CRM stages for tenants without stages
-- =========================================================
insert into public.crm_stages (tenant_id, name, position, is_default, color)
select t.id, s.name, s.position, s.is_default, s.color
from public.tenants t
cross join (
    values
      ('Novo Lead', 1, true, '#C8A152'),
      ('Qualificado', 2, false, '#9AA0A6'),
      ('Proposta Enviada', 3, false, '#7E8794'),
      ('Agendado', 4, false, '#59606B'),
      ('Fechado', 5, false, '#2F3540')
) as s(name, position, is_default, color)
where not exists (
    select 1
    from public.crm_stages st
    where st.tenant_id = t.id
);
