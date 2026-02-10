import { useState } from 'react';
import OpenAIService from '../services/openai';

const INITIAL_QUESTION = 'Para começarmos: Qual o nome da sua empresa e o que exatamente vocês fazem?';

export function useBriefingLogic({ knowledgeBase, setKnowledgeBase, setConfig }) {
    const [view, setView] = useState('dashboard');
    const [status, setStatus] = useState('idle');
    const [currentQuestion, setCurrentQuestion] = useState(INITIAL_QUESTION);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [lastAnalysis, setLastAnalysis] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [tempAnswer, setTempAnswer] = useState('');

    const syncBriefingText = (kb) => {
        const currentKB = kb || [];
        const text = currentKB.map((item) => `[P]: ${item.q}\n[R]: ${item.a}`).join('\n\n');
        setConfig({ briefing: text });
    };

    const handleNextInterview = async () => {
        if (!currentAnswer.trim()) return;

        setStatus('thinking');
        try {
            const analysis = await OpenAIService.analyzeKnowledgePoint(currentQuestion, currentAnswer);
            setLastAnalysis(analysis);

            const newItem = {
                id: Date.now(),
                q: currentQuestion,
                a: currentAnswer,
                analysis,
            };

            const currentKB = knowledgeBase || [];
            setKnowledgeBase([...currentKB, newItem]);
            setStatus('showing_analysis');
        } catch (error) {
            console.error('AURA: Error in interview step', error);
            setStatus('idle');
        }
    };

    const proceedToNext = async () => {
        setStatus('thinking');
        try {
            const nextQ = await OpenAIService.generateNextBriefingQuestion(knowledgeBase);

            if (nextQ.includes('COMPLETE') || knowledgeBase.length >= 10) {
                setStatus('idle');
                setView('dashboard');
                syncBriefingText(knowledgeBase);
            } else {
                setCurrentQuestion(nextQ);
                setCurrentAnswer('');
                setLastAnalysis('');
                setStatus('idle');
            }
        } catch {
            setStatus('idle');
        }
    };

    const handleUpdatePoint = async (id) => {
        const currentKB = knowledgeBase || [];
        const point = currentKB.find((item) => item.id === id);
        if (!point) return;

        setStatus('thinking');
        try {
            const analysis = await OpenAIService.analyzeKnowledgePoint(point.q, tempAnswer);
            const newKB = currentKB.map((item) =>
                item.id === id ? { ...item, a: tempAnswer, analysis } : item
            );
            setKnowledgeBase(newKB);
            syncBriefingText(newKB);
            setEditingId(null);
            setStatus('idle');
        } catch {
            setStatus('idle');
        }
    };

    const resetKnowledge = () => {
        setKnowledgeBase([]);
        setConfig({ briefing: '' });
        setView('interview');
        setStatus('idle');
        setCurrentQuestion(INITIAL_QUESTION);
        setCurrentAnswer('');
        setLastAnalysis('');
        setEditingId(null);
        setTempAnswer('');
    };

    return {
        view,
        setView,
        status,
        setStatus,
        currentQuestion,
        currentAnswer,
        setCurrentAnswer,
        lastAnalysis,
        editingId,
        setEditingId,
        tempAnswer,
        setTempAnswer,
        handleNextInterview,
        proceedToNext,
        handleUpdatePoint,
        resetKnowledge,
    };
}
