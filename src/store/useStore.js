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
            knowledgeBase: [
                {
                    id: 1707410001,
                    q: "Para começarmos: Qual o nome da sua empresa e o que exatamente vocês fazem?",
                    a: "Impar Odonto, somos uma clínica odontológica",
                    analysis: "Posicionamento claro. O nome 'Impar' sugere exclusividade e excelência. A IA adotará um tom profissional e acolhedor, reforçando a autoridade da clínica como referência em odontologia."
                },
                {
                    id: 1707410002,
                    q: "Qual é o endereço da Impar Odonto?",
                    a: "Avenida Amazonas, 1021 no Centro de Betim, Minas Gerais",
                    analysis: "Localização central estratégica. A IA destacará a conveniência e facilidade de acesso ao mencionar o endereço, usando 'Centro de Betim' como âncora de valor e referência conhecida."
                },
                {
                    id: 1707410003,
                    q: "Quais são os principais serviços e tratamentos oferecidos pela Impar Odonto?",
                    a: "Fazemos todos os tipos de tratamentos, desde odontopediatria a Implantes dentários, incluindo, clareamento, extraçao, protese, Invisalign (alinhadores) canal, etc",
                    analysis: "Portfólio 'Full Service'. A IA fará cross-selling inteligente (ex: sugerir clareamento após limpeza). A menção a 'Invisalign' e 'Implantes' indica foco em ticket médio alto e tecnologia."
                },
                {
                    id: 1707410004,
                    q: "Quais são os principais diferenciais da Impar Odonto em relação a outras clínicas odontológicas?",
                    a: "Somos uma clinica nova em Betim, e o ambiente é bem clean, diferenciado, estamos no terreo e possuimos estacionamento proprio.",
                    analysis: "Acessibilidade e Modernidade são pilares. 'Térreo' e 'Estacionamento' são argumentos fortes para conversão. 'Clean' e 'Nova' sugerem higiene e tecnologia de ponta, gerando confiança imediata."
                },
                {
                    id: 1707410005,
                    q: "Quais são os horários de funcionamento da Impar Odonto?",
                    a: "Segunda a Sexta, de 09h até as 18h e sabado de 09h ate as 12h.",
                    analysis: "Horário comercial padrão. A IA gerenciará expectativas fora desse horário, sugerindo agendamento para o próximo dia útil ou capturando o lead para retorno prioritário da equipe."
                },
                {
                    id: 1707410006,
                    q: "Vocês oferecem algum tipo de garantia ou acompanhamento pós-tratamento para os pacientes?",
                    a: "Garantia de 1 ano, e sempre acompanhamos nossos pacientes, acreditamos que dessa forma, estreitamos os laços e criamos conexao com nossos pacientes.",
                    analysis: "A 'Garantia de 1 ano' é um diferencial poderoso de confiança (Risk Reversal). O foco em 'conexão' define a personalidade da IA: empática, cuidadosa e relacional, não apenas transacional."
                },
                {
                    id: 1707410007,
                    q: "Vocês oferecem algum tipo de plano de pagamento ou financiamento para facilitar o acesso aos tratamentos?",
                    a: "Trabalhamos com pagamento em dinheiro, pix, cartao de debito e dividimos em ate 24 vezes sem juros. Pretendemos expandir nossas formas de pagamento e aceitar boletos em um futuro breve.",
                    analysis: "Flexibilidade financeira agressiva (24x sem juros) é um grande facilitador. A IA usará isso para quebrar objeções de preço, focado no que existe hoje (Cartão/Pix) para fechar vendas."
                },
                {
                    id: 1707410008,
                    q: "Quais são as principais preocupações ou dúvidas que seus pacientes costumam ter antes de iniciar um tratamento na Impar Odonto?",
                    a: "A maioria quer saber sobre preço. (ESTRATÉGIA: Podemos passar médias. Ex: Protocolos a partir de R$ 300,00 a R$ 600,00 na manutenção, ou valores de referência se perguntarem. O importante é não perder o lead por falta de informação, mas sempre tentar agendar).",
                    analysis: "Flexibilidade Tática. A IA usará 'Preço de Referência' (ex: 'a partir de') para qualificar o lead sem assustar. Se o valor for ok para o cliente, o agendamento é quase certo."
                },
                {
                    id: 1707410009,
                    q: "Vocês oferecem consultas de avaliação gratuitas ou algum tipo de desconto para novos pacientes?",
                    a: "Sim, oferecemos a consulta de avaliaçao como cortesia para que eles possam conhecer nossa estrutura e nossos excelentes profissionais",
                    analysis: "Isca perfeita (Lead Magnet). A 'Avaliação Cortesia' será o Call-to-Action (CTA) principal. O objetivo da conversa será agendar essa visita para o cliente conhecer a estrutura 'clean'."
                },
                {
                    id: 1707410010,
                    q: "Vocês têm alguma parceria com planos de saúde ou convênios odontológicos?",
                    a: "Não trabalhamos com covenios, preferimos trabalhar com materiais de primeira linha, o que não seria possivel se atendêssemos convenios.",
                    analysis: "Posicionamento Premium. A IA justificará a ausência de convênios com a qualidade superior dos materiais. 'Não atendemos convênio, atendemos você com o melhor que existe.'"
                }
            ], // v1.2.3: Structured Q&A for the Knowledge Dashboard
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
