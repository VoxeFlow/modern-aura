import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder';

function isValidSupabaseConfig(url, key) {
    const normalizedUrl = String(url || '').trim();
    const normalizedKey = String(key || '').trim();
    if (!normalizedUrl || !normalizedKey) return false;
    if (normalizedUrl.includes('placeholder')) return false;
    if (normalizedKey.toLowerCase() === 'placeholder') return false;
    return true;
}

function createSafeClient(url, key) {
    return createClient(url || PLACEHOLDER_URL, key || PLACEHOLDER_KEY);
}

const buildUrl = import.meta.env.VITE_SUPABASE_URL;
const buildAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let isSupabaseEnabled = isValidSupabaseConfig(buildUrl, buildAnonKey);
export let supabase = createSafeClient(
    isSupabaseEnabled ? buildUrl : PLACEHOLDER_URL,
    isSupabaseEnabled ? buildAnonKey : PLACEHOLDER_KEY
);
export let supabaseConfigSource = isSupabaseEnabled ? 'build' : 'none';

export function applySupabaseRuntimeConfig(url, anonKey, source = 'runtime') {
    if (!isValidSupabaseConfig(url, anonKey)) return false;
    const nextUrl = String(url).trim();
    const nextKey = String(anonKey).trim();
    supabase = createSafeClient(nextUrl, nextKey);
    isSupabaseEnabled = true;
    supabaseConfigSource = source;
    console.log(`AURA: Supabase runtime config applied (${source}).`);
    return true;
}

export async function bootstrapSupabaseConfig() {
    if (isSupabaseEnabled) return { enabled: true, source: supabaseConfigSource };

    // 1) optional pre-injected global (future-proof)
    if (typeof window !== 'undefined' && window.__AURA_RUNTIME_CONFIG) {
        const injected = window.__AURA_RUNTIME_CONFIG;
        const ok = applySupabaseRuntimeConfig(
            injected.VITE_SUPABASE_URL || injected.SUPABASE_URL,
            injected.VITE_SUPABASE_ANON_KEY || injected.SUPABASE_ANON_KEY,
            'window'
        );
        if (ok) return { enabled: true, source: supabaseConfigSource };
    }

    // 2) Cloudflare Functions runtime endpoint
    try {
        const response = await fetch('/api/runtime-config', { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            const ok = applySupabaseRuntimeConfig(
                data?.VITE_SUPABASE_URL || data?.SUPABASE_URL,
                data?.VITE_SUPABASE_ANON_KEY || data?.SUPABASE_ANON_KEY,
                'api'
            );
            if (ok) return { enabled: true, source: supabaseConfigSource };
        }
    } catch (error) {
        console.warn('AURA: Failed to load /api/runtime-config', error?.message || error);
    }

    console.warn('AURA: Supabase credentials missing/invalid (build + runtime).');
    return { enabled: false, source: 'none' };
}

console.log(`AURA: Supabase client initialized (${supabaseConfigSource}).`);
