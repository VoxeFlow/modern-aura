-- AURA Phase 3.3 - Plan per tenant
-- Add subscription plan at tenant level (lite/pro/scale)

alter table public.tenants
add column if not exists plan text not null default 'pro'
check (plan in ('lite', 'pro', 'scale'));

create index if not exists idx_tenants_plan on public.tenants(plan);
