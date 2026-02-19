import { isSupabaseEnabled, supabase } from './supabase';
import { unwrapMessageContent } from '../utils/messageContent';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
    return UUID_RE.test(String(value || '').trim());
}

function normalizeJid(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.includes('@') ? raw : `${raw}@s.whatsapp.net`;
}

function getDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function slugify(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isUniqueViolation(error) {
    return String(error?.code || '') === '23505';
}

export function scopeInstanceNameByTenant(tenantSlug = '', instanceName = '') {
    const cleanInstance = slugify(instanceName);
    if (!cleanInstance) return '';
    const cleanTenant = slugify(tenantSlug);
    if (!cleanTenant) return cleanInstance;
    if (cleanInstance.startsWith(`${cleanTenant}--`)) return cleanInstance;
    return `${cleanTenant}--${cleanInstance}`.slice(0, 80);
}

export function isScopedInstanceName(tenantSlug = '', instanceName = '') {
    const cleanTenant = slugify(tenantSlug);
    const cleanInstance = String(instanceName || '').trim().toLowerCase();
    if (!cleanInstance) return false;
    if (!cleanTenant) return true;
    return cleanInstance.startsWith(`${cleanTenant}--`);
}

function chatTimestampToIso(chat) {
    const ts = chat?.lastMessage?.messageTimestamp || chat?.messageTimestamp || chat?.conversationTimestamp || 0;
    if (!ts) return new Date().toISOString();
    return new Date(Number(ts) * 1000).toISOString();
}

function getChatName(chat) {
    return (
        chat?.name ||
        chat?.pushName ||
        chat?.verifiedName ||
        chat?.lastMessage?.pushName ||
        'Contato'
    );
}

function parseMessage(record) {
    const msg = unwrapMessageContent(record?.message || {});
    const body =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        '';
    let kind = 'text';
    if (msg?.audioMessage) kind = 'audio';
    else if (msg?.imageMessage) kind = 'image';
    else if (msg?.videoMessage) kind = 'video';
    else if (msg?.documentMessage) kind = 'document';
    else if (msg?.stickerMessage) kind = 'sticker';
    else if (!body) kind = 'unknown';
    return { body, kind };
}

async function ensureContact({ tenantId, chat, channelId = null }) {
    const jid = normalizeJid(chat?.chatJid || chat?.sendTargetJid || chat?.remoteJid || chat?.jid || chat?.id);
    if (!jid) return null;
    const phone = String(jid.split('@')[0] || '').replace(/\D/g, '') || null;

    const payload = {
        tenant_id: tenantId,
        channel_id: isUuid(channelId) ? channelId : null,
        external_id: String(chat?.chatKey || chat?.id || jid),
        jid,
        phone_e164: phone,
        display_name: String(getChatName(chat) || 'Contato').slice(0, 120),
        avatar_url: chat?.profilePicUrl || chat?.profilePictureUrl || chat?.avatar || null,
        source: 'whatsapp',
        last_seen_at: chatTimestampToIso(chat),
        metadata: {
            source_instance: chat?.sourceInstanceName || null,
            channel_label: chat?.channelLabel || null,
        },
    };

    const insertResult = await supabase
        .from('contacts')
        .insert(payload)
        .select('id,jid')
        .single();

    if (!insertResult.error) {
        return insertResult.data;
    }

    if (!isUniqueViolation(insertResult.error)) {
        throw insertResult.error;
    }

    const existingResult = await supabase
        .from('contacts')
        .select('id,jid')
        .eq('tenant_id', tenantId)
        .eq('jid', jid)
        .maybeSingle();

    if (existingResult.error) {
        throw existingResult.error;
    }

    if (!existingResult.data?.id) {
        throw insertResult.error;
    }

    const updatePayload = {
        channel_id: payload.channel_id,
        external_id: payload.external_id,
        phone_e164: payload.phone_e164,
        display_name: payload.display_name,
        avatar_url: payload.avatar_url,
        source: payload.source,
        last_seen_at: payload.last_seen_at,
        metadata: payload.metadata,
    };

    const updateResult = await supabase
        .from('contacts')
        .update(updatePayload)
        .eq('id', existingResult.data.id)
        .select('id,jid')
        .single();

    if (updateResult.error) {
        console.error('AURA tenant contact update after conflict failed:', updateResult.error);
        return existingResult.data;
    }

    return updateResult.data;
}

async function ensureConversation({ tenantId, contactId, channelId = null, chat }) {
    const payload = {
        tenant_id: tenantId,
        contact_id: contactId,
        channel_id: isUuid(channelId) ? channelId : null,
        status: 'open',
        last_message_at: chatTimestampToIso(chat),
        unread_count: Number(chat?.unreadCount || 0),
        subject: null,
        tags: [],
    };

    const { data, error } = await supabase
        .from('conversations')
        .upsert(payload, { onConflict: 'tenant_id,contact_id,channel_id' })
        .select('id')
        .single();
    if (error) throw error;
    return data?.id || null;
}

async function upsertMessageRow(row) {
    try {
        const canDeduplicate = Boolean(row?.tenant_id && row?.channel_id && row?.message_key);
        const insertResult = await supabase.from('messages').insert(row);
        if (!insertResult.error) return;
        if (canDeduplicate && isUniqueViolation(insertResult.error)) return;
        throw insertResult.error;
    } catch (error) {
        console.error('AURA tenant message persist error:', error);
    }
}

async function persistLastChatMessage({ tenantId, chat, contactId, conversationId, channelId = null }) {
    const last = chat?.lastMessage || null;
    if (!last?.message) return;

    const parsed = parseMessage(last);
    const keyId = last?.key?.id ? String(last.key.id) : null;
    const ts = Number(last?.messageTimestamp || chat?.messageTimestamp || 0);
    const row = {
        tenant_id: tenantId,
        conversation_id: conversationId,
        contact_id: contactId,
        channel_id: isUuid(channelId) ? channelId : null,
        message_key: keyId,
        direction: last?.key?.fromMe ? 'outgoing' : 'incoming',
        kind: parsed.kind,
        body: parsed.body || null,
        media_url: null,
        raw_payload: last || {},
        sent_at: ts ? new Date(ts * 1000).toISOString() : new Date().toISOString(),
    };

    await upsertMessageRow(row);
}

async function resolveChannelIdForChat({ tenantId, chat, channelsByInstance }) {
    if (isUuid(chat?.channelId)) return chat.channelId;
    const fromMap = channelsByInstance.get(String(chat?.sourceInstanceName || '').toLowerCase());
    if (fromMap) return fromMap;

    const label = String(chat?.channelLabel || '').toLowerCase();
    if (!label) return null;
    const { data } = await supabase
        .from('tenant_channels')
        .select('id,label')
        .eq('tenant_id', tenantId);
    const row = (data || []).find((item) => String(item?.label || '').toLowerCase() === label);
    return row?.id || null;
}

export async function loadTenantChannels(tenantId) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return [];
    const { data, error } = await supabase
        .from('tenant_channels')
        .select('id,label,instance_name,status,is_primary')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export function mapChannelsToStore(rows = []) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row, idx) => ({
        id: row.id,
        label: row.label || `Canal ${idx + 1}`,
        instanceName: row.instance_name || '',
    }));
}

export async function upsertTenantChannel({ tenantId, channel, userId = null, status = null, isPrimary = null }) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return null;
    const payload = {
        id: isUuid(channel?.id) ? channel.id : undefined,
        tenant_id: tenantId,
        label: String(channel?.label || 'Principal').trim().slice(0, 80),
        instance_name: String(channel?.instanceName || '').trim().slice(0, 80),
        created_by: isUuid(userId) ? userId : null,
    };
    if (status) payload.status = status;
    if (typeof isPrimary === 'boolean') payload.is_primary = isPrimary;

    const { data, error } = await supabase
        .from('tenant_channels')
        .upsert(payload, { onConflict: 'id' })
        .select('id,label,instance_name,status,is_primary')
        .single();
    if (error) throw error;
    return data;
}

export async function deleteTenantChannel({ tenantId, channelId }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !isUuid(channelId)) return;
    const { error } = await supabase
        .from('tenant_channels')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', channelId);
    if (error) throw error;
}

export async function ensureDefaultTenantChannel({ tenantId, userId = null }) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return [];
    const existing = await loadTenantChannels(tenantId);
    if (existing.length > 0) return existing;

    await upsertTenantChannel({
        tenantId,
        channel: { label: 'Principal', instanceName: '' },
        userId,
        isPrimary: true,
    });
    return loadTenantChannels(tenantId);
}

export async function normalizeTenantChannelsScope({ tenantId, tenantSlug }) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return [];
    const rows = await loadTenantChannels(tenantId);
    for (const row of rows) {
        const current = String(row?.instance_name || '').trim();
        if (!current) continue;
        const scoped = scopeInstanceNameByTenant(tenantSlug, current);
        if (!scoped || scoped === current) continue;
        const { error } = await supabase
            .from('tenant_channels')
            .update({ instance_name: scoped })
            .eq('tenant_id', tenantId)
            .eq('id', row.id);
        if (error) {
            console.error('AURA normalize channel scope error:', error);
        }
    }
    return loadTenantChannels(tenantId);
}

export async function loadCrmStagesAsTags(tenantId) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return [];
    const { data, error } = await supabase
        .from('crm_stages')
        .select('id,name,position,color')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color || '#C5A059',
        icon: '•',
    }));
}

export async function persistChatsSnapshot({ tenantId, chats = [] }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !Array.isArray(chats) || chats.length === 0) return;
    const { data: channelRows } = await supabase
        .from('tenant_channels')
        .select('id,instance_name')
        .eq('tenant_id', tenantId);
    const channelsByInstance = new Map(
        (channelRows || []).map((row) => [String(row.instance_name || '').toLowerCase(), row.id])
    );

    for (const chat of chats.slice(0, 300)) {
        try {
            const channelId = await resolveChannelIdForChat({ tenantId, chat, channelsByInstance });
            const contact = await ensureContact({ tenantId, chat, channelId });
            if (!contact?.id) continue;
            const conversationId = await ensureConversation({ tenantId, contactId: contact.id, channelId, chat });
            if (conversationId) {
                await persistLastChatMessage({
                    tenantId,
                    chat,
                    contactId: contact.id,
                    conversationId,
                    channelId,
                });
            }
        } catch (error) {
            console.error('AURA tenant persist chat error:', error);
        }
    }
}

export async function persistThreadMessages({ tenantId, chat, messages = [] }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !chat || !Array.isArray(messages) || messages.length === 0) return;

    const { data: channelRows } = await supabase
        .from('tenant_channels')
        .select('id,instance_name')
        .eq('tenant_id', tenantId);
    const channelsByInstance = new Map(
        (channelRows || []).map((row) => [String(row.instance_name || '').toLowerCase(), row.id])
    );

    const channelId = await resolveChannelIdForChat({ tenantId, chat, channelsByInstance });
    const contact = await ensureContact({ tenantId, chat, channelId });
    if (!contact?.id) return;
    const conversationId = await ensureConversation({ tenantId, contactId: contact.id, channelId, chat });
    if (!conversationId) return;

    const rows = messages.slice(0, 500).map((record) => {
        const parsed = parseMessage(record);
        const keyId = record?.key?.id ? String(record.key.id) : null;
        const ts = Number(record?.messageTimestamp || 0);
        return {
            tenant_id: tenantId,
            conversation_id: conversationId,
            contact_id: contact.id,
            channel_id: isUuid(channelId) ? channelId : null,
            message_key: keyId,
            direction: record?.key?.fromMe ? 'outgoing' : 'incoming',
            kind: parsed.kind,
            body: parsed.body || null,
            media_url: null,
            raw_payload: record || {},
            sent_at: ts ? new Date(ts * 1000).toISOString() : new Date().toISOString(),
        };
    });

    if (rows.length === 0) return;

    for (const row of rows) {
        await upsertMessageRow(row);
    }
}

export async function loadConversationSummaries(tenantId) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return [];
    const { data, error } = await supabase
        .from('conversations')
        .select('id,last_message_at,unread_count,channel_id,contacts:contact_id(display_name,jid,avatar_url),tenant_channels:channel_id(label,instance_name)')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false })
        .limit(200);
    if (error) throw error;

    return (data || []).map((row) => {
        const jid = row?.contacts?.jid || `${row.id}@s.whatsapp.net`;
        const digits = getDigits(jid);
        return {
            id: `conv:${row.id}`,
            chatKey: `conv:${row.id}`,
            crmKey: jid,
            chatJid: jid,
            remoteJid: jid,
            jid,
            phoneNumber: digits || null,
            name: row?.contacts?.display_name || 'Contato',
            profilePicUrl: row?.contacts?.avatar_url || null,
            messageTimestamp: row?.last_message_at ? Math.floor(new Date(row.last_message_at).getTime() / 1000) : 0,
            unreadCount: Number(row?.unread_count || 0),
            channelId: row?.channel_id || null,
            channelLabel: row?.tenant_channels?.label || null,
            sourceInstanceName: row?.tenant_channels?.instance_name || null,
            lastMessage: {
                messageTimestamp: row?.last_message_at ? Math.floor(new Date(row.last_message_at).getTime() / 1000) : 0,
                message: { conversation: '' },
            },
        };
    });
}

export async function loadLeadTagMap(tenantId) {
    if (!isSupabaseEnabled || !isUuid(tenantId)) return {};
    const { data, error } = await supabase
        .from('crm_leads')
        .select('stage_id,contacts:contact_id(jid),conversations:conversation_id(id)')
        .eq('tenant_id', tenantId);
    if (error) throw error;

    const map = {};
    (data || []).forEach((row) => {
        const stageId = row?.stage_id;
        if (!stageId) return;
        const jid = row?.contacts?.jid ? normalizeJid(row.contacts.jid) : '';
        const convId = row?.conversations?.id ? `conv:${row.conversations.id}` : '';
        const digits = getDigits(jid);
        if (jid) map[jid] = stageId;
        if (convId) map[convId] = stageId;
        if (digits) {
            map[`phone:${digits}`] = stageId;
            map[digits] = stageId;
        }
    });
    return map;
}

export async function persistLeadStage({ tenantId, chat, stageName, ownerUserId = null }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !chat || !stageName) return;
    try {
        const { data: stage, error: stageError } = await supabase
            .from('crm_stages')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('name', stageName)
            .limit(1)
            .maybeSingle();
        if (stageError || !stage?.id) return;

        const contact = await ensureContact({ tenantId, chat, channelId: chat?.channelId || null });
        if (!contact?.id) return;
        const conversationId = await ensureConversation({
            tenantId,
            contactId: contact.id,
            channelId: chat?.channelId || null,
            chat,
        });

        const payload = {
            tenant_id: tenantId,
            contact_id: contact.id,
            conversation_id: conversationId,
            stage_id: stage.id,
            owner_user_id: isUuid(ownerUserId) ? ownerUserId : null,
            title: stageName,
            status: stageName.toLowerCase() === 'fechado' ? 'won' : 'open',
        };

        const { error } = await supabase
            .from('crm_leads')
            .upsert(payload, { onConflict: 'tenant_id,contact_id' });
        if (error) {
            console.error('AURA tenant persist lead error:', error);
        }
    } catch (error) {
        console.error('AURA tenant persist lead exception:', error);
    }
}

export async function persistLearningEvent({ tenantId, userId = null, event }) {
    if (!isSupabaseEnabled || !isUuid(tenantId) || !event) return;
    if (!event?.finalText && !event?.enhancedText && !event?.suggestionText) return;

    const source =
        event?.type === 'magic_wand_accepted' ? 'wand' :
            event?.type === 'suggestion_edited_accepted' ? 'suggestion' :
                'manual';

    const payload = {
        tenant_id: tenantId,
        source,
        prompt: event?.suggestionText || null,
        ai_output: event?.enhancedText || event?.suggestionText || null,
        final_output: event?.finalText || null,
        accepted: source !== 'manual',
        score: source === 'manual' ? 50 : 90,
        created_by: isUuid(userId) ? userId : null,
    };

    const { error } = await supabase.from('ai_learning_events').insert(payload);
    if (error) {
        console.error('AURA tenant persist learning error:', error);
    }
}
