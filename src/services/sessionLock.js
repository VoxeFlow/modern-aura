import { isSupabaseEnabled, supabase } from './supabase';

const DEVICE_ID_KEY = 'aura_device_id';
const DEFAULT_TTL_SECONDS = 180;

function fallbackDeviceId() {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId() {
    if (typeof window === 'undefined') return 'server-device';
    const current = String(localStorage.getItem(DEVICE_ID_KEY) || '').trim();
    if (current) return current;

    const nextId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : fallbackDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, nextId);
    return nextId;
}

function normalizeRpcResult(data) {
    if (!data) return { ok: false, reason: 'empty_response' };
    if (typeof data === 'boolean') return { ok: data, reason: data ? 'ok' : 'rejected' };
    if (typeof data === 'object') {
        return {
            ok: Boolean(data.ok),
            reason: String(data.reason || (data.ok ? 'ok' : 'rejected')),
            heartbeatAt: data.heartbeat_at || null,
            lockedDeviceId: data.locked_device_id || null,
        };
    }
    return { ok: false, reason: 'invalid_response' };
}

export async function claimUserSession({ ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
    if (!isSupabaseEnabled) return { ok: true, reason: 'supabase_disabled' };

    const { data, error } = await supabase.rpc('claim_user_session', {
        p_device_id: getDeviceId(),
        p_ttl_seconds: ttlSeconds,
    });
    if (error) return { ok: false, reason: error.message || 'claim_failed' };
    return normalizeRpcResult(data);
}

export async function heartbeatUserSession({ ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
    if (!isSupabaseEnabled) return { ok: true, reason: 'supabase_disabled' };

    const { data, error } = await supabase.rpc('heartbeat_user_session', {
        p_device_id: getDeviceId(),
        p_ttl_seconds: ttlSeconds,
    });
    if (error) return { ok: false, reason: error.message || 'heartbeat_failed' };
    return normalizeRpcResult(data);
}

export async function releaseUserSession() {
    if (!isSupabaseEnabled) return { ok: true, reason: 'supabase_disabled' };

    const { data, error } = await supabase.rpc('release_user_session', {
        p_device_id: getDeviceId(),
    });
    if (error) return { ok: false, reason: error.message || 'release_failed' };
    return normalizeRpcResult(data);
}
