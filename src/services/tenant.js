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
        .select('tenant_id, role, status, tenants:tenant_id(id, name, slug, plan)')
        .eq('user_id', user.id)
        .eq('status', 'active');

    if (error) throw error;

    let rows = Array.isArray(memberships) ? memberships : [];
    if (rows.length === 0) {
        const tenant = await createTenantForUser(user);
        rows = [{ tenant_id: tenant.id, role: 'owner', status: 'active', tenants: tenant }];
    }

    const tenants = rows
        .map((row) => ({
            id: row?.tenants?.id || row?.tenant_id,
            name: row?.tenants?.name || 'Workspace',
            slug: row?.tenants?.slug || '',
            plan: row?.tenants?.plan || 'pro',
            role: row?.role || 'agent',
        }))
        .filter((row) => row.id);

    const selected = tenants.find((row) => row.id === preferredTenantId) || tenants[0];
    return {
        tenantId: selected?.id || null,
        tenantName: selected?.name || '',
        tenantSlug: selected?.slug || '',
        tenantPlan: selected?.plan || 'pro',
        tenants,
    };
}
