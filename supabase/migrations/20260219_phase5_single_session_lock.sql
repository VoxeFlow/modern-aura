-- AURA Phase 5 - Single device session lock per user
-- Goal: block concurrent use of the same account on multiple machines.

create extension if not exists pgcrypto;

create table if not exists public.user_session_locks (
    user_id uuid primary key references auth.users(id) on delete cascade,
    device_id text not null,
    user_agent text,
    issued_at timestamptz not null default now(),
    heartbeat_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_user_session_locks_heartbeat
on public.user_session_locks (heartbeat_at desc);

alter table public.user_session_locks enable row level security;

drop policy if exists user_session_locks_select_own on public.user_session_locks;
create policy user_session_locks_select_own
on public.user_session_locks
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_session_locks_insert_own on public.user_session_locks;
create policy user_session_locks_insert_own
on public.user_session_locks
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_session_locks_update_own on public.user_session_locks;
create policy user_session_locks_update_own
on public.user_session_locks
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_session_locks_delete_own on public.user_session_locks;
create policy user_session_locks_delete_own
on public.user_session_locks
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.claim_user_session(
    p_device_id text,
    p_ttl_seconds integer default 180
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_now timestamptz := now();
    v_ttl integer := greatest(coalesce(p_ttl_seconds, 180), 30);
    v_cutoff timestamptz := v_now - make_interval(secs => v_ttl);
    v_lock public.user_session_locks%rowtype;
begin
    if v_uid is null then
        return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
    end if;

    if coalesce(length(trim(p_device_id)), 0) < 8 then
        return jsonb_build_object('ok', false, 'reason', 'invalid_device');
    end if;

    select * into v_lock
    from public.user_session_locks
    where user_id = v_uid
    for update;

    if not found then
        insert into public.user_session_locks (user_id, device_id, user_agent, issued_at, heartbeat_at, created_at, updated_at)
        values (v_uid, p_device_id, left(coalesce(current_setting('request.headers', true), ''), 500), v_now, v_now, v_now, v_now);
        return jsonb_build_object('ok', true, 'reason', 'claimed');
    end if;

    if v_lock.device_id = p_device_id then
        update public.user_session_locks
        set heartbeat_at = v_now,
            updated_at = v_now
        where user_id = v_uid;
        return jsonb_build_object('ok', true, 'reason', 'renewed');
    end if;

    if v_lock.heartbeat_at is null or v_lock.heartbeat_at < v_cutoff then
        update public.user_session_locks
        set device_id = p_device_id,
            user_agent = left(coalesce(current_setting('request.headers', true), ''), 500),
            issued_at = v_now,
            heartbeat_at = v_now,
            updated_at = v_now
        where user_id = v_uid;
        return jsonb_build_object('ok', true, 'reason', 'takeover_expired');
    end if;

    return jsonb_build_object(
        'ok', false,
        'reason', 'active_on_other_device',
        'locked_device_id', v_lock.device_id,
        'heartbeat_at', v_lock.heartbeat_at
    );
end;
$$;

create or replace function public.heartbeat_user_session(
    p_device_id text,
    p_ttl_seconds integer default 180
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_now timestamptz := now();
    v_ttl integer := greatest(coalesce(p_ttl_seconds, 180), 30);
    v_cutoff timestamptz := v_now - make_interval(secs => v_ttl);
    v_lock public.user_session_locks%rowtype;
begin
    if v_uid is null then
        return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
    end if;

    select * into v_lock
    from public.user_session_locks
    where user_id = v_uid
    for update;

    if not found then
        return jsonb_build_object('ok', false, 'reason', 'no_lock');
    end if;

    if v_lock.device_id <> p_device_id then
        if v_lock.heartbeat_at is null or v_lock.heartbeat_at < v_cutoff then
            return jsonb_build_object('ok', false, 'reason', 'lock_expired_claim_required');
        end if;
        return jsonb_build_object('ok', false, 'reason', 'active_on_other_device');
    end if;

    update public.user_session_locks
    set heartbeat_at = v_now,
        updated_at = v_now
    where user_id = v_uid;

    return jsonb_build_object('ok', true, 'reason', 'heartbeat_ok');
end;
$$;

create or replace function public.release_user_session(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_deleted integer := 0;
begin
    if v_uid is null then
        return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
    end if;

    delete from public.user_session_locks
    where user_id = v_uid
      and device_id = p_device_id;
    get diagnostics v_deleted = row_count;

    return jsonb_build_object('ok', v_deleted > 0, 'reason', case when v_deleted > 0 then 'released' else 'not_owner_or_missing' end);
end;
$$;

revoke all on function public.claim_user_session(text, integer) from public;
revoke all on function public.heartbeat_user_session(text, integer) from public;
revoke all on function public.release_user_session(text) from public;

grant execute on function public.claim_user_session(text, integer) to authenticated;
grant execute on function public.heartbeat_user_session(text, integer) to authenticated;
grant execute on function public.release_user_session(text) to authenticated;
