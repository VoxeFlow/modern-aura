import { useCallback, useState } from 'react';
import OpenAIService from '../services/openai';
import { buildStructuredHistory, deriveAnalysisData, getClientNameForAi, getLastAssistantText, getLastClientText } from '../utils/chatArea';
import { useStore } from '../store/useStore';

export function useChatAI({ activeChat, messages, briefing, setInput }) {
    const [suggestion, setSuggestion] = useState('');
    const [analysisData, setAnalysisData] = useState({ level: '', intent: '', strategy: '' });
    const [isEnhancing, setIsEnhancing] = useState(false);

    const resetAiState = useCallback(() => {
        setSuggestion('');
        setAnalysisData({ level: '', intent: '', strategy: '' });
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!activeChat) return;

        const wandIcon = document.querySelector('.btn-primary.v3-btn svg');
        if (wandIcon) wandIcon.style.animation = 'spin 1s linear infinite';

        try {
            const quota = useStore.getState().consumeAiQuota(1);
            if (!quota.ok) {
                setSuggestion(`Limite mensal de IA atingido (${quota.used}/${quota.limit}). Faça upgrade para continuar.`);
                return;
            }

            const clientName = getClientNameForAi(activeChat);
            const structuredHistory = buildStructuredHistory(messages);
            const lastClientText = getLastClientText(messages);
            const lastAssistantText = getLastAssistantText(messages);
            const learningContext = useStore.getState().buildLearningContext(activeChat.id);
            const { chatTags, tags } = useStore.getState();
            const currentTagId = chatTags?.[activeChat.id];
            const currentStage = tags?.find((item) => item.id === currentTagId)?.name || '';

            setSuggestion('Aura Orquestrador v8.7: Sincronizando contexto completo v1.1.7...');

            const RAGService = (await import('../services/rag')).default;
            const ragContext = await RAGService.getRelevantContext(lastClientText);
            const extraContext = [ragContext, learningContext].filter(Boolean).join('\n\n');

            const aiRes = await OpenAIService.generateSuggestion({
                clientName,
                history: structuredHistory,
                extraContext,
                briefing: briefing || 'Negócio de Alto Padrão',
                lastClientText,
                lastAssistantText,
                currentStage,
            });

            if (aiRes) {
                // AURA v11: Knowledge Gap Detection
                if (aiRes.includes('[KNOWLEDGE_GAP:')) {
                    const managerQuestion = aiRes.match(/\[KNOWLEDGE_GAP:\s*(.*?)]/)?.[1] || 'Pergunta não identificada';
                    const { managerPhone, setConfig, pendingGaps } = useStore.getState();

                    if (managerPhone) {
                        setSuggestion(`🧠 AURA identificou uma lacuna no cérebro. Consultando especialista através do WhatsApp...`);

                        // Send message to manager
                        const WhatsAppService = (await import('../services/whatsapp')).default;
                        const managerMsg = `🚨 *AURA: Nova Dúvida de Lead*\n\nUm lead perguntou algo que não sei responder.\n\n*Pergunta para você:* ${managerQuestion}\n\n_Responda esta mensagem para atualizar meu cérebro automaticamente._`;

                        await WhatsAppService.sendMessage(managerPhone, managerMsg);

                        // Track pending gap
                        const gapId = `gap-${Date.now()}`;
                        setConfig({
                            pendingGaps: {
                                ...pendingGaps,
                                [managerPhone.replace(/\D/g, '')]: {
                                    id: gapId,
                                    chatId: activeChat.id,
                                    question: managerQuestion,
                                    timestamp: Date.now()
                                }
                            }
                        });
                    } else {
                        setSuggestion(`⚠️ AURA precisa saber: "${managerQuestion}". (Configure o telefone do gestor nas configurações para automatizar isso).`);
                    }
                } else {
                    setAnalysisData(deriveAnalysisData(aiRes));
                    setSuggestion(aiRes.trim());
                    useStore.getState().recordLearningEvent({
                        type: 'ai_suggestion_generated',
                        chatId: activeChat.id,
                        source: 'ai',
                        suggestionText: aiRes.trim(),
                        lastClientText,
                    });
                }
            } else {
                setSuggestion('Não foi possível gerar uma sugestão no momento. Tente novamente.');
            }
        } catch (error) {
            console.error('AURA Analysis Error:', error);
            setSuggestion('Ops! Ocorreu um erro na análise inteligente.');
        } finally {
            if (wandIcon) wandIcon.style.animation = 'none';
        }
    }, [activeChat, briefing, messages]);

    const handleEnhance = useCallback(async (input) => {
        if (!input.trim() || isEnhancing) return;

        if (!useStore.getState().hasFeature('magic_wand')) {
            return;
        }

        setIsEnhancing(true);
        const originalInput = input;
        setInput('✨ Aura refinando sua mensagem...');

        try {
            const quota = useStore.getState().consumeAiQuota(1);
            if (!quota.ok) {
                setInput(originalInput);
                setSuggestion(`Limite mensal de IA atingido (${quota.used}/${quota.limit}). Faça upgrade para continuar.`);
                return;
            }

            const enhanced = await OpenAIService.enhanceMessage(originalInput, { briefing });
            if (enhanced && enhanced !== originalInput) {
                setInput(enhanced);
                if (activeChat?.id) {
                    useStore.getState().recordLearningEvent({
                        type: 'magic_wand_generated',
                        chatId: activeChat.id,
                        source: 'magic_wand',
                        originalText: originalInput,
                        enhancedText: enhanced,
                    });
                }
            } else {
                setInput(originalInput);
            }
        } catch (error) {
            console.error('AURA Enhance Error:', error);
            setInput(originalInput);
        } finally {
            setIsEnhancing(false);
        }
    }, [activeChat?.id, briefing, isEnhancing, setInput]);

    return {
        suggestion,
        setSuggestion,
        analysisData,
        setAnalysisData,
        isEnhancing,
        resetAiState,
        handleAnalyze,
        handleEnhance,
    };
}
