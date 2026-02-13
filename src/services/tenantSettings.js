import { isSupabaseEnabled, supabase } from './supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
    return UUID_RE.test(String(value || '').trim());
}

function normalizeKnowledgeBase(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value || '').trim();
}

export async function loadTenantSettings(tenantId) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return null;
    const { data, error } = await supabase
        .from('tenant_settings')
        .select('tenant_id,briefing,knowledge_base,manager_phone,api_url,api_key,onboarding_completed')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
        tenantId: data.tenant_id,
        briefing: String(data.briefing || ''),
        knowledgeBase: normalizeKnowledgeBase(data.knowledge_base),
        managerPhone: String(data.manager_phone || ''),
        apiUrl: String(data.api_url || ''),
        apiKey: String(data.api_key || ''),
        onboardingCompleted: Boolean(data.onboarding_completed),
    };
}

export async function upsertTenantSettings({ tenantId, userId = null, patch = {} }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !patch || typeof patch !== 'object') return null;

    const payload = {
        tenant_id: tenantId,
        updated_by: isUuid(userId) ? userId : null,
    };

    if (Object.prototype.hasOwnProperty.call(patch, 'briefing')) {
        payload.briefing = normalizeText(patch.briefing);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'knowledgeBase')) {
        payload.knowledge_base = normalizeKnowledgeBase(patch.knowledgeBase);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'managerPhone')) {
        payload.manager_phone = normalizeText(patch.managerPhone);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'apiUrl')) {
        payload.api_url = normalizeText(patch.apiUrl);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'apiKey')) {
        payload.api_key = normalizeText(patch.apiKey);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'onboardingCompleted')) {
        payload.onboarding_completed = Boolean(patch.onboardingCompleted);
    }

    const { data, error } = await supabase
        .from('tenant_settings')
        .upsert(payload, { onConflict: 'tenant_id' })
        .select('tenant_id,briefing,knowledge_base,manager_phone,api_url,api_key,onboarding_completed')
        .single();

    if (error) throw error;
    return {
        tenantId: data.tenant_id,
        briefing: String(data.briefing || ''),
        knowledgeBase: normalizeKnowledgeBase(data.knowledge_base),
        managerPhone: String(data.manager_phone || ''),
        apiUrl: String(data.api_url || ''),
        apiKey: String(data.api_key || ''),
        onboardingCompleted: Boolean(data.onboarding_completed),
    };
}
