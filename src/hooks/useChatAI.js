import { useCallback, useState } from 'react';
import OpenAIService from '../services/openai';
import { buildStructuredHistory, deriveAnalysisData, getClientNameForAi, getLastClientText } from '../utils/chatArea';

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
            const clientName = getClientNameForAi(activeChat);
            const structuredHistory = buildStructuredHistory(messages);
            const lastClientText = getLastClientText(messages);

            setSuggestion('Aura Orquestrador v8.7: Sincronizando contexto completo v1.1.7...');

            const RAGService = (await import('../services/rag')).default;
            const extraContext = await RAGService.getRelevantContext(lastClientText);

            const aiRes = await OpenAIService.generateSuggestion({
                clientName,
                history: structuredHistory,
                extraContext,
                briefing: briefing || 'Negócio de Alto Padrão',
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

        setIsEnhancing(true);
        const originalInput = input;
        setInput('✨ Aura refinando sua mensagem...');

        try {
            const enhanced = await OpenAIService.enhanceMessage(originalInput, { briefing });
            if (enhanced && enhanced !== originalInput) {
                setInput(enhanced);
            } else {
                setInput(originalInput);
            }
        } catch (error) {
            console.error('AURA Enhance Error:', error);
            setInput(originalInput);
        } finally {
            setIsEnhancing(false);
        }
    }, [briefing, isEnhancing, setInput]);

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
