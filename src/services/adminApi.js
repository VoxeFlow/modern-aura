import { supabase } from './supabase';

async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sessão inválida. Faça login novamente.');
    return token;
}

export async function fetchAdminTenants() {
    const token = await getAccessToken();
    const res = await fetch('/api/admin/tenants', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(payload?.error || 'Falha ao carregar clientes.');
    }
    return Array.isArray(payload?.tenants) ? payload.tenants : [];
}

export async function updateAdminTenantPlan({ tenantId, plan }) {
    const token = await getAccessToken();
    const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId, plan }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(payload?.error || 'Falha ao atualizar plano.');
    }
    return payload?.tenant || null;
}
