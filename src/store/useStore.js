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

export const useStore = create(
    persist(
        (set, get) => ({
            apiUrl: import.meta.env.VITE_API_URL || 'https://api.voxeflow.com',
            apiKey: import.meta.env.VITE_API_KEY || '',
            instanceName: import.meta.env.VITE_INSTANCE_NAME || 'VoxeFlow',
            briefing: '', // V7: Start empty to trigger interactive briefing
            knowledgeBase: [], // Start empty for clean onboarding
            ragSources: [], // AURA v11: Clean state - RAG dependent on user input only

            isConnected: false,
            currentView: 'dashboard',
            chats: [],
            activeChat: null,
            messages: [],
            lastFetchedJid: null,
            pendingOutgoing: {},

            // CRM State - AURA Gold Palette
            tags: [
                { id: 'novo', name: 'Novo Lead', icon: '🆕', color: '#C5A059' },
                { id: 'qualificado', name: 'Qualificado', icon: '✅', color: '#d4af6a' },
                { id: 'proposta', name: 'Proposta Enviada', icon: '📋', color: '#af8a43' },
                { id: 'agendado', name: 'Agendado', icon: '📅', color: '#c09850' },
                { id: 'fechado', name: 'Fechado', icon: '💰', color: '#e0c080' },
                { id: 'perdido', name: 'Perdido', icon: '❌', color: '#8a6d3a' }
            ],
            chatTags: {}, // { chatId: tagId }
            chatNextSteps: {}, // { chatId: { steps: [], priority: '', reasoning: '' } }

            // AURA v11: Knowledge Loop
            managerPhone: '', // The specialist/manager WhatsApp number
            pendingGaps: {}, // { gapId: { chatId, question, timestamp } }

            setConfig: (config) => set((state) => ({ ...state, ...config })),
            setChats: (chats) => {
                console.log(`AURA: Updating store with ${chats?.length || 0} chats`);
                set({ chats });
            },

            setActiveChat: (chat) => {
                console.log("AURA: Setting active chat:", chat?.id);
                set({ activeChat: chat, messages: [], lastFetchedJid: null });
            },

            clearMessages: () => set({ messages: [], lastFetchedJid: null }),

            setMessages: (jid, messages) => {
                const currentActive = get().activeChat;
                if (!currentActive) return;

                const activeJid = currentActive.id || currentActive.remoteJid;

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

                const activeJid = active?.id || active?.remoteJid;
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
                    chats: [],
                    messages: [],
                    activeChat: null,
                    lastFetchedJid: null,
                    chatTags: {}, // Optional: keep tags or clear? Better clear for privacy.
                    chatNextSteps: {}
                });
                localStorage.removeItem('auth_token');
                localStorage.removeItem('aura-storage'); // Nuke state persistence
            },

            // CRM Actions
            setTag: (chatId, tagId) => set(state => ({
                chatTags: { ...state.chatTags, [chatId]: tagId }
            })),

            setKnowledgeBase: (knowledgeBase) => set({ knowledgeBase }),

            setNextSteps: (chatId, data) => set(state => ({
                chatNextSteps: { ...state.chatNextSteps, [chatId]: data }
            })),

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
            // PERSIST chats so they don't disappear on refresh
            partialize: (state) => ({
                apiUrl: state.apiUrl,
                apiKey: state.apiKey,
                instanceName: state.instanceName,
                briefing: state.briefing,
                knowledgeBase: state.knowledgeBase,
                ragSources: state.ragSources,
                currentView: state.currentView,
                chats: state.chats,
                chatTags: state.chatTags, // Persist tags
                chatNextSteps: state.chatNextSteps, // Persist AI suggestions
                managerPhone: state.managerPhone,
                pendingGaps: state.pendingGaps
            }),
        }
    )
);
