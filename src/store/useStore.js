import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    dedupeMessages,
    getJidDigits,
    getMessageIdentity,
    reconcileMessages,
    sortMessagesDesc,
} from '../utils/messageSync';

// Helper to extract number from JID for safe comparison
const getChatKey = (jid) => getJidDigits(jid);
const PLAN_CONFIG = {
    lite: {
        label: 'Lite',
        aiMonthlyLimit: 500,
        features: ['ai_suggestion'],
    },
    pro: {
        label: 'Pro',
        aiMonthlyLimit: 2000,
        features: ['ai_suggestion', 'magic_wand', 'crm_basic'],
    },
    scale: {
        label: 'Scale',
        aiMonthlyLimit: 6000,
        features: ['ai_suggestion', 'magic_wand', 'crm_basic', 'crm_full', 'multi_whatsapp', 'multi_user', 'reports'],
    },
};

function normalizePlan(plan) {
    const key = String(plan || '').toLowerCase();
    return PLAN_CONFIG[key] ? key : 'pro';
}

function getMonthKey(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
}

function slugifyInstanceName(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

function scopeInstanceName(tenantSlug = '', value = '') {
    const base = slugifyInstanceName(value);
    if (!base) return '';
    const tenantPrefix = slugifyInstanceName(tenantSlug || '');
    if (!tenantPrefix) return base;
    if (base.startsWith(`${tenantPrefix}--`)) return base;
    return `${tenantPrefix}--${base}`.slice(0, 80);
}

const DEFAULT_TAGS = [
    { id: 'novo', name: 'Novo Lead', icon: '🆕', color: '#C5A059' },
    { id: 'qualificado', name: 'Qualificado', icon: '✅', color: '#d4af6a' },
    { id: 'proposta', name: 'Proposta Enviada', icon: '📋', color: '#af8a43' },
    { id: 'agendado', name: 'Agendado', icon: '📅', color: '#c09850' },
    { id: 'fechado', name: 'Fechado', icon: '💰', color: '#e0c080' },
    { id: 'perdido', name: 'Perdido', icon: '❌', color: '#8a6d3a' }
];

const DEFAULT_CHANNELS = [
    {
        id: 'channel-default',
        label: 'Principal',
        instanceName: '',
    },
];

const DEFAULT_TEAM_USERS = [
    {
        id: 'owner-1',
        name: 'Administrador',
        role: 'owner',
        email: '',
    },
];

export const useStore = create(
    persist(
        (set, get) => ({
            apiUrl: import.meta.env.VITE_API_URL || 'https://api.voxeflow.com',
            apiKey: import.meta.env.VITE_API_KEY || '',
            instanceName: '',
            briefing: '', // V7: Start empty to trigger interactive briefing
            knowledgeBase: [], // Start empty for clean onboarding
            ragSources: [], // AURA v11: Clean state - RAG dependent on user input only
            subscriptionPlan: normalizePlan(import.meta.env.VITE_DEFAULT_PLAN || 'pro'),
            aiUsageByMonth: {},
            whatsappChannels: DEFAULT_CHANNELS,
            activeWhatsAppChannelId: 'channel-default',
            whatsappChannelStatus: {},
            teamUsers: DEFAULT_TEAM_USERS,
            tenantId: null,
            tenantSlug: '',
            tenantName: '',
            tenantPlan: 'pro',
            availableTenants: [],
            userId: null,
            userEmail: '',

            isConnected: false,
            currentView: 'dashboard',
            chats: [],
            activeChat: null,
            messages: [],
            lastFetchedJid: null,
            pendingOutgoing: {},

            // CRM State - AURA Gold Palette
            tags: DEFAULT_TAGS,
            chatTags: {}, // { chatId: tagId }
            chatNextSteps: {}, // { chatId: { steps: [], priority: '', reasoning: '' } }

            // AURA v11: Knowledge Loop
            managerPhone: '', // The specialist/manager WhatsApp number
            pendingGaps: {}, // { gapId: { chatId, question, timestamp } }
            learningEvents: [], // Rolling learning log for accepted messages and edits

            setAuthIdentity: ({ userId = null, userEmail = '' } = {}) => set((state) => {
                const nextUserId = userId || null;
                const hasUserChanged = Boolean(state.userId && nextUserId && state.userId !== nextUserId);
                if (!hasUserChanged) {
                    return {
                        userId: nextUserId,
                        userEmail: String(userEmail || '').trim().toLowerCase(),
                    };
                }
                return {
                    userId: nextUserId,
                    userEmail: String(userEmail || '').trim().toLowerCase(),
                    isConnected: false,
                    chats: [],
                    activeChat: null,
                    messages: [],
                    lastFetchedJid: null,
                    pendingOutgoing: {},
                    tags: DEFAULT_TAGS,
                    chatTags: {},
                    chatNextSteps: {},
                    managerPhone: '',
                    pendingGaps: {},
                    learningEvents: [],
                    briefing: '',
                    knowledgeBase: [],
                    ragSources: [],
                    currentView: 'dashboard',
                    whatsappChannels: DEFAULT_CHANNELS,
                    activeWhatsAppChannelId: 'channel-default',
                    whatsappChannelStatus: {},
                    teamUsers: DEFAULT_TEAM_USERS,
                    apiKey: '',
                    tenantId: null,
                    tenantSlug: '',
                    tenantName: '',
                    tenantPlan: 'pro',
                    availableTenants: [],
                    subscriptionPlan: normalizePlan(import.meta.env.VITE_DEFAULT_PLAN || 'pro'),
                    aiUsageByMonth: {},
                };
            }),
            applyTenantContext: ({ tenantId = null, tenantSlug = '', tenantName = '', tenantPlan = 'pro', tenants = [] } = {}) => set((state) => {
                const nextTenantId = tenantId || null;
                const hasTenantChanged = state.tenantId !== nextTenantId;
                const normalizedTenantPlan = normalizePlan(tenantPlan || 'pro');
                const base = {
                    tenantId: nextTenantId,
                    tenantSlug: tenantSlug || '',
                    tenantName: tenantName || '',
                    tenantPlan: normalizedTenantPlan,
                    subscriptionPlan: normalizedTenantPlan,
                    availableTenants: Array.isArray(tenants) ? tenants : [],
                };
                if (!hasTenantChanged) return base;

                // Hard isolate local state between tenants (prevents cross-tenant data leaks in browser persistence).
                return {
                    ...base,
                    isConnected: false,
                    chats: [],
                    activeChat: null,
                    messages: [],
                    lastFetchedJid: null,
                    pendingOutgoing: {},
                    tags: DEFAULT_TAGS,
                    chatTags: {},
                    chatNextSteps: {},
                    managerPhone: '',
                    pendingGaps: {},
                    learningEvents: [],
                    instanceName: '',
                    whatsappChannels: DEFAULT_CHANNELS,
                    activeWhatsAppChannelId: 'channel-default',
                    whatsappChannelStatus: {},
                    teamUsers: DEFAULT_TEAM_USERS,
                    apiKey: '',
                    subscriptionPlan: normalizedTenantPlan,
                    aiUsageByMonth: {},
                };
            }),

            setConfig: (config) => set((state) => {
                const next = { ...state, ...config };
                if (typeof config?.instanceName === 'string') {
                    const normalizedInstanceName = scopeInstanceName(state.tenantSlug, config.instanceName);
                    next.instanceName = normalizedInstanceName;
                    const channels = Array.isArray(state.whatsappChannels) ? [...state.whatsappChannels] : [];
                    const activeIdx = channels.findIndex((item) => item.id === state.activeWhatsAppChannelId);
                    if (activeIdx >= 0 && normalizedInstanceName) {
                        channels[activeIdx] = {
                            ...channels[activeIdx],
                            instanceName: normalizedInstanceName,
                        };
                        next.whatsappChannels = channels;
                    }
                }
                return next;
            }),
            setSubscriptionPlan: (plan) => set({ subscriptionPlan: normalizePlan(plan) }),
            getPlanConfig: () => {
                const plan = normalizePlan(get().subscriptionPlan);
                return PLAN_CONFIG[plan];
            },
            hasFeature: (feature) => {
                const plan = normalizePlan(get().subscriptionPlan);
                const features = PLAN_CONFIG[plan]?.features || [];
                return features.includes(feature);
            },
            getAiUsage: () => {
                const monthKey = getMonthKey();
                return Number(get().aiUsageByMonth?.[monthKey] || 0);
            },
            getAiQuota: () => {
                const plan = normalizePlan(get().subscriptionPlan);
                return Number(PLAN_CONFIG[plan]?.aiMonthlyLimit || 0);
            },
            getAiRemaining: () => {
                const limit = get().getAiQuota();
                const used = get().getAiUsage();
                return Math.max(0, limit - used);
            },
            consumeAiQuota: (units = 1) => {
                const amount = Math.max(1, Number(units) || 1);
                const monthKey = getMonthKey();
                const used = Number(get().aiUsageByMonth?.[monthKey] || 0);
                const limit = get().getAiQuota();

                if (used + amount > limit) {
                    return {
                        ok: false,
                        used,
                        limit,
                        remaining: Math.max(0, limit - used),
                    };
                }

                set((state) => ({
                    aiUsageByMonth: {
                        ...state.aiUsageByMonth,
                        [monthKey]: used + amount,
                    }
                }));

                return {
                    ok: true,
                    used: used + amount,
                    limit,
                    remaining: Math.max(0, limit - (used + amount)),
                };
            },
            getMaxWhatsAppChannels: () => (get().hasFeature('multi_whatsapp') ? 3 : 1),
            getActiveWhatsAppChannel: () => {
                const state = get();
                const channels = Array.isArray(state.whatsappChannels) ? state.whatsappChannels : [];
                return channels.find((item) => item.id === state.activeWhatsAppChannelId) || channels[0] || null;
            },
            canAddWhatsAppChannel: () => {
                const state = get();
                const channels = Array.isArray(state.whatsappChannels) ? state.whatsappChannels : [];
                if (channels.length >= state.getMaxWhatsAppChannels()) return false;
                if (channels.length === 0) return true;
                const firstId = channels[0]?.id;
                return state.whatsappChannelStatus?.[firstId] === 'open';
            },
            setWhatsAppChannelStatus: (channelId, connectionState) => set((state) => ({
                whatsappChannelStatus: {
                    ...state.whatsappChannelStatus,
                    [channelId]: connectionState || 'disconnected',
                },
            })),
            setWhatsAppChannels: (channels = [], activeId = null) => set((state) => {
                const list = Array.isArray(channels) && channels.length > 0 ? channels : DEFAULT_CHANNELS;
                const fallbackActive = activeId || state.activeWhatsAppChannelId || list[0]?.id;
                const active = list.find((item) => item.id === fallbackActive) || list[0] || null;
                return {
                    whatsappChannels: list,
                    activeWhatsAppChannelId: active?.id || null,
                    instanceName: active?.instanceName || '',
                };
            }),
            switchWhatsAppChannel: (channelId) => set((state) => {
                const channels = Array.isArray(state.whatsappChannels) ? state.whatsappChannels : [];
                const found = channels.find((item) => item.id === channelId);
                if (!found) return {};
                return {
                    activeWhatsAppChannelId: found.id,
                    instanceName: found.instanceName,
                };
            }),
            addWhatsAppChannel: ({ label, instanceName }) => {
                const state = get();
                const channels = Array.isArray(state.whatsappChannels) ? state.whatsappChannels : [];
                if (channels.length >= state.getMaxWhatsAppChannels()) {
                    return { ok: false, reason: 'limit' };
                }
                const firstId = channels[0]?.id;
                if (channels.length > 0 && firstId && state.whatsappChannelStatus?.[firstId] !== 'open') {
                    return { ok: false, reason: 'first_not_connected' };
                }

                const cleanInstance = slugifyInstanceName(instanceName || label);
                const scopedInstance = scopeInstanceName(state.tenantSlug, cleanInstance);
                if (!scopedInstance) {
                    return { ok: false, reason: 'invalid_instance' };
                }

                if (channels.some((item) => String(item.instanceName || '').toLowerCase() === scopedInstance.toLowerCase())) {
                    return { ok: false, reason: 'duplicate_instance' };
                }

                const newChannel = {
                    id: `channel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    label: String(label || cleanInstance).trim() || cleanInstance,
                    instanceName: scopedInstance,
                };

                set({
                    whatsappChannels: [...channels, newChannel],
                    activeWhatsAppChannelId: newChannel.id,
                    instanceName: newChannel.instanceName,
                });

                return { ok: true, channel: newChannel };
            },
            updateWhatsAppChannel: (channelId, { label, instanceName }) => {
                const state = get();
                const channels = Array.isArray(state.whatsappChannels) ? [...state.whatsappChannels] : [];
                const idx = channels.findIndex((item) => item.id === channelId);
                if (idx < 0) return { ok: false, reason: 'not_found' };

                const current = channels[idx];
                const nextLabel = String(label ?? current.label).trim();
                const nextInstanceRaw = String(instanceName ?? current.instanceName).trim();
                const nextInstance = scopeInstanceName(state.tenantSlug, nextInstanceRaw);

                if (!nextInstance) return { ok: false, reason: 'invalid_instance' };
                const duplicate = channels.some((item, itemIdx) => itemIdx !== idx && String(item.instanceName || '').toLowerCase() === nextInstance.toLowerCase());
                if (duplicate) return { ok: false, reason: 'duplicate_instance' };

                channels[idx] = {
                    ...current,
                    label: nextLabel || current.label,
                    instanceName: nextInstance,
                };

                const payload = {
                    whatsappChannels: channels,
                };
                if (state.activeWhatsAppChannelId === channelId) {
                    payload.instanceName = nextInstance;
                }

                set(payload);
                return { ok: true, channel: channels[idx] };
            },
            removeWhatsAppChannel: (channelId) => {
                const state = get();
                const channels = Array.isArray(state.whatsappChannels) ? state.whatsappChannels : [];
                if (channels.length <= 1) return { ok: false, reason: 'minimum_one_channel' };

                const nextChannels = channels.filter((item) => item.id !== channelId);
                if (nextChannels.length === channels.length) return { ok: false, reason: 'not_found' };

                let nextActiveId = state.activeWhatsAppChannelId;
                if (nextActiveId === channelId) {
                    nextActiveId = nextChannels[0]?.id || null;
                }
                const nextActive = nextChannels.find((item) => item.id === nextActiveId) || nextChannels[0] || null;

                set({
                    whatsappChannels: nextChannels,
                    activeWhatsAppChannelId: nextActive?.id || null,
                    instanceName: nextActive?.instanceName || state.instanceName,
                });

                return { ok: true };
            },
            getMaxTeamUsers: () => (get().hasFeature('multi_user') ? 10 : 1),
            canAddTeamUser: () => {
                const state = get();
                const users = Array.isArray(state.teamUsers) ? state.teamUsers : [];
                return users.length < state.getMaxTeamUsers();
            },
            addTeamUser: ({ name, email = '', role = 'agent' }) => {
                const state = get();
                if (!state.canAddTeamUser()) return { ok: false, reason: 'limit' };

                const cleanName = String(name || '').trim();
                if (!cleanName) return { ok: false, reason: 'invalid_name' };

                const cleanEmail = String(email || '').trim().toLowerCase();
                const users = Array.isArray(state.teamUsers) ? state.teamUsers : [];
                if (cleanEmail && users.some((user) => String(user.email || '').toLowerCase() === cleanEmail)) {
                    return { ok: false, reason: 'duplicate_email' };
                }

                const newUser = {
                    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: cleanName,
                    email: cleanEmail,
                    role: role === 'manager' ? 'manager' : 'agent',
                };

                set({ teamUsers: [...users, newUser] });
                return { ok: true, user: newUser };
            },
            removeTeamUser: (userId) => set((state) => {
                const users = Array.isArray(state.teamUsers) ? state.teamUsers : [];
                const owners = users.filter((user) => user.role === 'owner');
                const target = users.find((user) => user.id === userId);
                if (target?.role === 'owner' && owners.length <= 1) return {};
                if (users.length <= 1) return {};
                return { teamUsers: users.filter((user) => user.id !== userId) };
            }),
            setChats: (chats) => {
                console.log(`AURA: Updating store with ${chats?.length || 0} chats`);
                set((state) => {
                    const list = Array.isArray(chats) ? chats : [];
                    if (state.tenantId) {
                        return { chats: list };
                    }
                    const currentTags = state.chatTags || {};
                    const novoLeadTagId = state.tags.find((t) => t.id === 'novo')?.id || state.tags[0]?.id;

                    if (!novoLeadTagId) {
                        return { chats: list };
                    }

                    const nextTags = { ...currentTags };
                    let taggedCount = 0;

                    list.forEach((chat) => {
                        const chatId = chat?.id || chat?.remoteJid || chat?.jid;
                        if (!chatId) return;
                        if (!nextTags[chatId]) {
                            nextTags[chatId] = novoLeadTagId;
                            taggedCount += 1;
                        }
                    });

                    if (taggedCount > 0) {
                        console.log(`AURA CRM: Auto-tagged ${taggedCount} new chats as Novo Lead`);
                    }

                    return {
                        chats: list,
                        chatTags: nextTags,
                    };
                });
            },

            setActiveChat: (chat) => set((state) => {
                console.log("AURA: Setting active chat:", chat?.id);
                const next = {
                    activeChat: chat,
                    messages: [],
                    lastFetchedJid: null,
                };

                if (chat?.channelId) {
                    const channel = (state.whatsappChannels || []).find((item) => item.id === chat.channelId);
                    if (channel) {
                        next.activeWhatsAppChannelId = channel.id;
                        next.instanceName = channel.instanceName;
                    }
                }

                return next;
            }),

            clearMessages: () => set({ messages: [], lastFetchedJid: null }),

            setMessages: (jid, messages) => {
                const currentActive = get().activeChat;
                if (!currentActive) return;

                const activeJid =
                    currentActive.chatJid ||
                    currentActive.sendTargetJid ||
                    currentActive.remoteJid ||
                    currentActive.jid ||
                    currentActive.id;

                // Use numbers-only comparison for maximum safety
                if (getJidDigits(activeJid) === getJidDigits(jid)) {
                    console.log(`AURA: Updating messages for ${jid} (${messages?.length || 0} msgs)`);
                    const chatKey = getChatKey(activeJid);
                    const pending = get().pendingOutgoing[chatKey] || [];
                    const { merged, stillPending } = reconcileMessages(messages || [], pending, 30 * 60 * 1000);

                    set((state) => ({
                        messages: merged,
                        lastFetchedJid: jid,
                        pendingOutgoing: { ...state.pendingOutgoing, [chatKey]: stillPending },
                    }));
                } else {
                    console.warn(`AURA: Blocked message leak from ${jid} to ${activeJid}`);
                }
            },

            appendPendingOutgoing: (jid, text, serverRecord = null) => {
                const state = get();
                const active = state.activeChat;
                if (!jid || !text?.trim()) return;

                const nowMs = Date.now();
                const outgoing = serverRecord?.key ? {
                    ...serverRecord,
                    __local: true,
                    __createdAt: nowMs,
                } : {
                    key: {
                        id: `local-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
                        fromMe: true,
                        remoteJid: jid,
                    },
                    messageTimestamp: Math.floor(nowMs / 1000),
                    message: { conversation: text.trim() },
                    __local: true,
                    __createdAt: nowMs,
                };

                const chatKey = getChatKey(jid);
                const currentPending = state.pendingOutgoing[chatKey] || [];
                const nextPending = dedupeMessages([outgoing, ...currentPending]);

                const activeJid =
                    active?.chatJid ||
                    active?.sendTargetJid ||
                    active?.remoteJid ||
                    active?.jid ||
                    active?.id;
                const shouldAppendToVisible = activeJid && getJidDigits(activeJid) === getJidDigits(jid);
                const nextVisible = shouldAppendToVisible
                    ? sortMessagesDesc(dedupeMessages([outgoing, ...state.messages]))
                    : state.messages;

                set((prev) => ({
                    messages: nextVisible,
                    pendingOutgoing: {
                        ...prev.pendingOutgoing,
                        [chatKey]: nextPending,
                    },
                }));
            },

            appendRealtimeMessage: (record) => {
                const state = get();
                const active = state.activeChat;
                if (!active || !record?.key) return;

                const activeNums = [
                    active.chatJid,
                    active.sendTargetJid,
                    active.id,
                    active.remoteJid,
                    active.jid,
                    active.linkedLid,
                ].map(getJidDigits).filter(Boolean);

                const recordNums = [
                    record.key?.remoteJid,
                    record.remoteJid,
                    record.key?.participant,
                    record.participant,
                ].map(getJidDigits).filter(Boolean);

                const belongsToActive = record.key?.fromMe || recordNums.some((num) => activeNums.includes(num));
                if (!belongsToActive) return;

                const incomingFp = getMessageIdentity(record);
                const exists = state.messages.some((item) => getMessageIdentity(item) === incomingFp);
                if (exists) return;

                // AUTO-TAGGING: If this chat has no tag, assign the first one (Novo Lead)
                const chatId = record.key?.remoteJid || record.remoteJid;
                if (chatId && !state.chatTags[chatId] && state.tags.length > 0) {
                    // Check if it's already in the chats list to avoid re-tagging known errors, but generally safe
                    console.log(`AURA CRM: Auto-tagging new lead ${chatId} to ${state.tags[0].name}`);
                    set(prev => ({
                        chatTags: { ...prev.chatTags, [chatId]: prev.tags[0].id }
                    }));
                }

                set({ messages: [record, ...state.messages] });
            },

            setIsConnected: (isConnected) => set({ isConnected }),
            setCurrentView: (view) => set({ currentView: view }),

            // FINAL GHOST FIX: Centralized view switching with guaranteed cleanup
            switchView: (viewName) => {
                console.log(`AURA: Switching view to ${viewName}, clearing active state`);
                set({
                    currentView: viewName,
                    activeChat: null,
                    messages: [],
                    lastFetchedJid: null
                });
            },

            // ACTION: Logout and Clear State
            logout: () => {
                console.log('AURA: Logging out and clearing data...');
                set({
                    isConnected: false,
                    tenantId: null,
                    tenantSlug: '',
                    tenantName: '',
                    tenantPlan: 'pro',
                    availableTenants: [],
                    userId: null,
                    userEmail: '',
                    chats: [],
                    messages: [],
                    activeChat: null,
                    lastFetchedJid: null,
                    chatTags: {}, // Optional: keep tags or clear? Better clear for privacy.
                    chatNextSteps: {}
                });
                localStorage.removeItem('auth_token');
                localStorage.removeItem('aura-storage'); // Nuke state persistence
                localStorage.removeItem('aura_tenant_id');
            },

            // CRM ACTIONS
            addLead: (leadData) => set((state) => {
                const idSeed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
                const leadPhone = String(leadData?.phone || '').replace(/\D/g, '');
                const jid = leadPhone ? `${leadPhone}@s.whatsapp.net` : `lead-${idSeed}@s.whatsapp.net`;
                const chatId = jid;
                const leadName = leadData?.name || leadData?.company || 'Novo Lead';

                const newChat = {
                    id: chatId,
                    remoteJid: jid,
                    name: leadName,
                    pushName: leadName,
                    messageTimestamp: Math.floor(Date.now() / 1000),
                    lastMessage: {
                        messageTimestamp: Math.floor(Date.now() / 1000),
                        message: { conversation: `Lead cadastrado: ${leadName}` },
                    },
                };

                const exists = (state.chats || []).some((chat) => (chat.id || chat.remoteJid) === chatId);
                const updatedChats = exists ? state.chats : [newChat, ...(state.chats || [])];
                const novoLeadTagId = state.tags.find((t) => t.id === 'novo')?.id || state.tags[0]?.id;

                return {
                    chats: updatedChats,
                    chatTags: {
                        ...state.chatTags,
                        ...(novoLeadTagId ? { [chatId]: novoLeadTagId } : {}),
                    },
                };
            }),

            addCRMColumn: (name) => set(state => {
                const newId = `col-${Date.now()}`;
                return {
                    tags: [...state.tags, { id: newId, name, icon: '📁', color: '#86868b' }]
                };
            }),

            updateCRMColumn: (id, updates) => set(state => ({
                tags: state.tags.map(t => t.id === id ? { ...t, ...updates } : t)
            })),
            setTags: (tags = []) => set(() => ({
                tags: Array.isArray(tags) && tags.length > 0 ? tags : DEFAULT_TAGS,
            })),
            setChatTags: (chatTags = {}) => set(() => ({
                chatTags: chatTags && typeof chatTags === 'object' ? chatTags : {},
            })),

            // CRM Actions
            setTag: (chatId, tagId) => set((state) => {
                const next = {
                    chatTags: { ...state.chatTags, [chatId]: tagId }
                };

                const chat = (state.chats || []).find((item) => {
                    const candidates = [
                        item?.crmKey,
                        item?.chatKey,
                        item?.id,
                        item?.chatJid,
                        item?.remoteJid,
                        item?.jid,
                    ];
                    return candidates.includes(chatId);
                });
                const stage = (state.tags || []).find((item) => item.id === tagId);
                if (chat && stage?.name) {
                    import('../services/tenantData')
                        .then(({ persistLeadStage }) => persistLeadStage({
                            tenantId: state.tenantId,
                            chat,
                            stageName: stage.name,
                            ownerUserId: state.userId,
                        }))
                        .catch((error) => console.error('AURA CRM sync error:', error));
                }

                return next;
            }),

            setKnowledgeBase: (knowledgeBase) => set({ knowledgeBase }),

            setNextSteps: (chatId, data) => set(state => ({
                chatNextSteps: { ...state.chatNextSteps, [chatId]: data }
            })),

            recordLearningEvent: (event) => set((state) => {
                const next = [
                    ...state.learningEvents,
                    {
                        id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        timestamp: Date.now(),
                        ...event,
                    }
                ];

                // Keep bounded memory footprint
                import('../services/tenantData')
                    .then(({ persistLearningEvent }) => persistLearningEvent({
                        tenantId: state.tenantId,
                        userId: state.userId,
                        event,
                    }))
                    .catch((error) => console.error('AURA learning sync error:', error));

                return { learningEvents: next.slice(-500) };
            }),

            buildLearningContext: (chatId, limit = 8) => {
                const events = (get().learningEvents || [])
                    .filter((item) => item?.chatId === chatId || item?.scope === 'global')
                    .filter((item) =>
                        item?.type === 'message_sent' ||
                        item?.type === 'suggestion_edited_accepted' ||
                        item?.type === 'magic_wand_accepted'
                    )
                    .slice(-Math.max(1, limit));

                if (events.length === 0) return '';

                const lines = events.map((item) => {
                    const source = item?.source || 'manual';
                    const finalText = String(item?.finalText || '').trim();
                    const suggestionText = String(item?.suggestionText || '').trim();
                    const enhancedText = String(item?.enhancedText || '').trim();

                    if (item.type === 'magic_wand_accepted') {
                        return `- [PADRÃO ACEITO | varinha] ${enhancedText || finalText}`;
                    }
                    if (item.type === 'suggestion_edited_accepted') {
                        return `- [PADRÃO ACEITO | edição da IA] IA: ${suggestionText} => ENVIADO: ${finalText}`;
                    }
                    return `- [ENVIADO | ${source}] ${finalText}`;
                }).filter(Boolean);

                if (lines.length === 0) return '';
                return `APRENDIZADO OPERACIONAL RECENTE (preferências do usuário):\n${lines.join('\n')}`;
            },

            resetBrain: () => {
                console.log('AURA: Performing lobotomy (Reset Brain)...');
                set({
                    knowledgeBase: [],
                    briefing: '',
                    ragSources: [],
                    currentView: 'interview' // Force back to interview mode
                });
            },

            getChatsWithTag: (tagId) => {
                const state = get();
                return state.chats.filter(c => {
                    const jid = c.remoteJid || c.jid || c.id;
                    return state.chatTags[jid] === tagId;
                });
            },
        }),
        {
            name: 'aura-storage',
            version: 2,
            migrate: (persistedState) => {
                const state = (persistedState && typeof persistedState === 'object') ? persistedState : {};
                return {
                    currentView: state.currentView || 'dashboard',
                };
            },
            // Keep local persistence minimal to avoid cross-device drift and tenant data bleed.
            partialize: (state) => ({
                currentView: state.currentView,
            }),
        }
    )
);
