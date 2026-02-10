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
                setAnalysisData(deriveAnalysisData(aiRes));
                setSuggestion(aiRes.trim());
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
