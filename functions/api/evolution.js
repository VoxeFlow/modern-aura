import { createClient } from '@supabase/supabase-js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function getEnvOrThrow(env, keys) {
    for (const key of keys) {
        const value = env[key];
        if (value) return value;
    }
    throw new Error(`Variável ausente: ${keys.join(' ou ')}`);
}

async function assertAuthenticated({ request, env }) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return { ok: false, status: 401, error: 'Sessão inválida.' };

    const supabaseUrl = getEnvOrThrow(env, ['VITE_SUPABASE_URL']);
    const serviceRoleKey = getEnvOrThrow(env, ['SUPABASE_SERVICE_ROLE_KEY']);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user?.id) return { ok: false, status: 401, error: 'Sessão inválida.' };
    return { ok: true };
}

function buildEvolutionUrl(baseUrl, path = '', search = '') {
    const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
    const cleanPath = String(path || '').trim().replace(/^\/+/, '');
    const suffix = cleanPath ? `/${cleanPath}` : '';
    return `${cleanBase}${suffix}${search || ''}`;
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') return json({ ok: true });

    try {
        const auth = await assertAuthenticated({ request, env });
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        const evolutionUrl = getEnvOrThrow(env, ['EVOLUTION_API_URL', 'VITE_API_URL']);
        const evolutionKey = getEnvOrThrow(env, ['EVOLUTION_API_KEY', 'VITE_API_KEY']);
        const url = new URL(request.url);
        const path = String(url.searchParams.get('path') || '').trim();
        if (!path) return json({ error: 'Parâmetro path é obrigatório.' }, 400);

        const passthroughSearch = new URLSearchParams(url.searchParams);
        passthroughSearch.delete('path');
        const qs = passthroughSearch.toString();
        const upstreamUrl = buildEvolutionUrl(evolutionUrl, path, qs ? `?${qs}` : '');

        const headers = new Headers();
        headers.set('apikey', evolutionKey);
        const contentType = request.headers.get('content-type');
        if (contentType) headers.set('content-type', contentType);

        const isBodyMethod = !['GET', 'HEAD'].includes(request.method.toUpperCase());
        const body = isBodyMethod ? await request.arrayBuffer() : undefined;

        const upstreamRes = await fetch(upstreamUrl, {
            method: request.method,
            headers,
            body,
        });

        const upstreamContentType = upstreamRes.headers.get('content-type') || '';
        const raw = await upstreamRes.arrayBuffer();

        return new Response(raw, {
            status: upstreamRes.status,
            headers: {
                'Content-Type': upstreamContentType || 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return json({ error: error?.message || 'Falha no proxy Evolution.' }, 500);
    }
}
