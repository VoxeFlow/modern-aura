import { createClient } from '@supabase/supabase-js';

const ALLOWED_PLANS = new Set(['lite', 'pro', 'scale']);

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function getEnvOrThrow(env, key) {
    const value = env[key];
    if (!value) throw new Error(`Variável ausente: ${key}`);
    return value;
}

async function getRequesterEmail({ request, supabaseUrl, serviceRoleKey }) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return null;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${token}`,
        },
    });

    if (!userRes.ok) return null;
    const user = await userRes.json().catch(() => null);
    return String(user?.email || '').trim().toLowerCase() || null;
}

async function assertOwner(request, env) {
    const supabaseUrl = getEnvOrThrow(env, 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnvOrThrow(env, 'SUPABASE_SERVICE_ROLE_KEY');
    const masterEmail = String(env.VITE_MASTER_EMAIL || env.MASTER_EMAIL || '').trim().toLowerCase();
    if (!masterEmail) throw new Error('Variável ausente: VITE_MASTER_EMAIL');

    const requesterEmail = await getRequesterEmail({ request, supabaseUrl, serviceRoleKey });
    if (!requesterEmail) return { ok: false, status: 401, error: 'Sessão inválida.' };
    if (requesterEmail !== masterEmail) return { ok: false, status: 403, error: 'Acesso restrito ao dono da plataforma.' };

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return { ok: true, admin };
}

async function listTenants(admin) {
    const { data: tenants, error: tenantsError } = await admin
        .from('tenants')
        .select('id,name,slug,plan,owner_user_id,updated_at,created_at')
        .order('created_at', { ascending: true });
    if (tenantsError) throw tenantsError;

    const { data: memberships, error: membershipsError } = await admin
        .from('tenant_memberships')
        .select('tenant_id,user_id,status');
    if (membershipsError) throw membershipsError;

    const { data: channels, error: channelsError } = await admin
        .from('tenant_channels')
        .select('tenant_id,id');
    if (channelsError && channelsError.code !== 'PGRST116') throw channelsError;

    const ownerIds = [...new Set((tenants || []).map((t) => t.owner_user_id).filter(Boolean))];
    const ownerEmailById = new Map();
    for (const ownerId of ownerIds) {
        const { data, error } = await admin.auth.admin.getUserById(ownerId);
        if (!error && data?.user?.email) {
            ownerEmailById.set(ownerId, data.user.email);
        }
    }

    const membersByTenant = (memberships || []).reduce((acc, row) => {
        const key = row.tenant_id;
        if (!key) return acc;
        if (!acc[key]) acc[key] = new Set();
        if (row.status === 'active') acc[key].add(row.user_id);
        return acc;
    }, {});

    const channelsByTenant = (channels || []).reduce((acc, row) => {
        const key = row.tenant_id;
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return (tenants || []).map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: String(tenant.plan || 'pro').toLowerCase(),
        owner_email: ownerEmailById.get(tenant.owner_user_id) || '',
        team_count: membersByTenant[tenant.id]?.size || 0,
        channel_count: channelsByTenant[tenant.id] || 0,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
    }));
}

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') {
        return json({ ok: true });
    }

    try {
        const auth = await assertOwner(request, env);
        if (!auth.ok) return json({ error: auth.error }, auth.status);
        const admin = auth.admin;

        if (request.method === 'GET') {
            const tenants = await listTenants(admin);
            return json({ tenants });
        }

        if (request.method === 'PATCH') {
            const body = await request.json().catch(() => ({}));
            const tenantId = String(body?.tenantId || '').trim();
            const plan = String(body?.plan || '').trim().toLowerCase();
            if (!tenantId) return json({ error: 'tenantId é obrigatório.' }, 400);
            if (!ALLOWED_PLANS.has(plan)) return json({ error: 'Plano inválido.' }, 400);

            const { data, error } = await admin
                .from('tenants')
                .update({ plan, updated_at: new Date().toISOString() })
                .eq('id', tenantId)
                .select('id,name,slug,plan,updated_at')
                .single();
            if (error) throw error;
            return json({ tenant: data });
        }

        return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
        return json({ error: error?.message || 'Erro interno no admin.' }, 500);
    }
}
