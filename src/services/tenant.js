import { isSupabaseEnabled, supabase } from './supabase';

function slugifyTenantName(value = '') {
    const base = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base.slice(0, 48) || `tenant-${Date.now()}`;
}

async function createTenantForUser(user) {
    const email = String(user?.email || '').toLowerCase();
    const defaultName = email ? email.split('@')[0] : `tenant-${Date.now()}`;
    const displayName = defaultName.replace(/[._-]+/g, ' ').trim() || 'Workspace';
    const slug = slugifyTenantName(defaultName);

    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
            name: displayName,
            slug,
            owner_user_id: user.id,
            plan: 'pro',
        })
        .select('id, name, slug, plan')
        .single();

    if (tenantError) throw tenantError;

    const { error: memberError } = await supabase
        .from('tenant_memberships')
        .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            role: 'owner',
            status: 'active',
        });

    if (memberError) throw memberError;

    return tenant;
}

export async function resolveTenantContext({ user, preferredTenantId = null }) {
    if (!isSupabaseEnabled || !user?.id) {
        return {
            tenantId: 'legacy-local',
            tenantName: 'Workspace Local',
            tenantSlug: 'legacy-local',
            tenantPlan: 'pro',
            tenants: [{ id: 'legacy-local', name: 'Workspace Local', slug: 'legacy-local', role: 'owner' }],
        };
    }

    const { data: memberships, error } = await supabase
        .from('tenant_memberships')
        .select('tenant_id, role, status, tenants:tenant_id(id, name, slug, plan), tenant_settings:tenant_id(onboarding_completed,api_url,api_key,manager_phone,briefing)')
        .eq('user_id', user.id)
        .eq('status', 'active');

    if (error) throw error;

    let rows = Array.isArray(memberships) ? memberships : [];
    if (rows.length === 0) {
        const tenant = await createTenantForUser(user);
        rows = [{ tenant_id: tenant.id, role: 'owner', status: 'active', tenants: tenant }];
    }

    const pickOne = (value) => (Array.isArray(value) ? (value[0] || null) : value);

    const hasTenantConfig = (settings) => {
        const cfg = pickOne(settings) || {};
        return (
            Boolean(cfg.onboarding_completed) ||
            Boolean(String(cfg.api_url || '').trim()) ||
            Boolean(String(cfg.api_key || '').trim()) ||
            Boolean(String(cfg.manager_phone || '').trim()) ||
            Boolean(String(cfg.briefing || '').trim())
        );
    };

    const cleanPlan = (value) => String(value || '').trim().toLowerCase();

    const tenants = rows
        .map((row) => {
            const tenantRow = pickOne(row?.tenants);
            return ({
            id: tenantRow?.id || row?.tenant_id,
            name: tenantRow?.name || 'Workspace',
            slug: tenantRow?.slug || '',
            plan: cleanPlan(tenantRow?.plan || 'pro'),
            role: row?.role || 'agent',
            hasConfig: hasTenantConfig(row?.tenant_settings),
        })})
        .filter((row) => row.id);
    const roleRank = { owner: 0, admin: 1, agent: 2, viewer: 3 };
    const planRank = { scale: 0, pro: 1, lite: 2 };
    const orderedTenants = [...tenants].sort((a, b) => {
        const planA = planRank[cleanPlan(a.plan)] ?? 99;
        const planB = planRank[cleanPlan(b.plan)] ?? 99;
        if (planA !== planB) return planA - planB;

        if (a.hasConfig !== b.hasConfig) return a.hasConfig ? -1 : 1;

        const roleA = roleRank[a.role] ?? 99;
        const roleB = roleRank[b.role] ?? 99;
        if (roleA !== roleB) return roleA - roleB;

        return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });

    const selected = orderedTenants.find((row) => row.id === preferredTenantId) || orderedTenants[0];
    return {
        tenantId: selected?.id || null,
        tenantName: selected?.name || '',
        tenantSlug: selected?.slug || '',
        tenantPlan: selected?.plan || 'pro',
        tenants: orderedTenants,
    };
}
