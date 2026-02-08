import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Helper to extract number from JID for safe comparison
const getNum = (jid) => String(jid || "").split('@')[0].replace(/\D/g, '');

export const useStore = create(
    persist(
        (set, get) => ({
            apiUrl: import.meta.env.VITE_API_URL || 'https://api.voxeflow.com',
            apiKey: import.meta.env.VITE_API_KEY || 'Beatriz@CB650',
            instanceName: import.meta.env.VITE_INSTANCE_NAME || 'VoxeFlow',
            briefing: '', // V7: Start empty to trigger interactive briefing
            knowledgeBase: [], // v1.2.3: Structured Q&A for the Knowledge Dashboard
            ragSources: [
                { id: 1, name: 'Tabela de Preços - Invisalign', keywords: ['preço', 'valor', 'quanto', 'invisalign'], content: 'O Invisalign Lite começa em R$ 8.000. O Full em R$ 12.000. Parcelamos em 12x sem juros.' },
                { id: 2, name: 'Protocolo Ortodontia', keywords: ['aparelho', 'ferrinho', 'orto', 'manutenção'], content: 'Manutenção mensal de R$ 150. Documentação ortodôntica inclusa no fechamento.' },
                { id: 3, name: 'Implantes Dentários', keywords: ['implante', 'dente', 'parafuso', 'dentadura'], content: 'Trabalhamos com Implantes Straumann (Suíços). Avaliação inicial inclui escaneamento 3D.' }
            ], // AURA v8: RAG Specialist Agents

            isConnected: false,
            currentView: 'dashboard',
            chats: [],
            activeChat: null,
            messages: [],
            lastFetchedJid: null,

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
                if (getNum(activeJid) === getNum(jid)) {
                    console.log(`AURA: Updating messages for ${jid} (${messages?.length || 0} msgs)`);
                    set({ messages, lastFetchedJid: jid });
                } else {
                    console.warn(`AURA: Blocked message leak from ${jid} to ${activeJid}`);
                }
            },

            setIsConnected: (isConnected) => set({ isConnected }),
            setCurrentView: (view) => set({ currentView: view }),

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
                chatNextSteps: state.chatNextSteps // Persist AI suggestions
            }),
        }
    )
);
