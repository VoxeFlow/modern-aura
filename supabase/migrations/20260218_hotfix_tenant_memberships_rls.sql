-- Hotfix: remove recursive policy on tenant_memberships that causes:
-- "infinite recursion detected in policy for relation tenant_memberships"

alter table public.tenant_memberships enable row level security;

drop policy if exists tenant_memberships_manage_by_owner on public.tenant_memberships;
drop policy if exists tenant_memberships_select_own on public.tenant_memberships;
drop policy if exists tenant_memberships_insert_own on public.tenant_memberships;
drop policy if exists tenant_memberships_update_own on public.tenant_memberships;
drop policy if exists tenant_memberships_delete_own on public.tenant_memberships;

-- Safe non-recursive policies
create policy tenant_memberships_select_own
on public.tenant_memberships
for select
to authenticated
using (user_id = auth.uid());

create policy tenant_memberships_insert_own
on public.tenant_memberships
for insert
to authenticated
with check (user_id = auth.uid());

-- Optional self-service update/delete (kept strict to own row only)
create policy tenant_memberships_update_own
on public.tenant_memberships
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy tenant_memberships_delete_own
on public.tenant_memberships
for delete
to authenticated
using (user_id = auth.uid());
