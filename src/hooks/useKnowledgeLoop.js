import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import OpenAIService from '../services/openai';
import WhatsAppService from '../services/whatsapp';

export function useKnowledgeLoop() {
    const {
        managerPhone,
        pendingGaps,
        knowledgeBase,
        setKnowledgeBase,
        setConfig
    } = useStore();

    useEffect(() => {
        if (!managerPhone) return;

        // Custom event or polling logic to detect manager's response
        // In this implementation, we'll use a globally exposed handler 
        // that the App can call when a new message arrives.

        const handleNewManagerMessage = async (msg) => {
            const sender = msg.key.remoteJid?.replace(/\D/g, '') || '';
            const cleanManagerPhone = managerPhone.replace(/\D/g, '');

            if (sender !== cleanManagerPhone) return;

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            if (!text) return;

            console.log('AURA Loop: Manager response detected:', text);

            const gap = pendingGaps[cleanManagerPhone];
            if (gap) {
                console.log('AURA Loop: Resolving gap:', gap.question);

                try {
                    // 1. Analyze the manager's answer to create a clean point
                    const analysis = await OpenAIService.analyzeKnowledgePoint(gap.question, text);

                    const newItem = {
                        id: Date.now(),
                        q: gap.question,
                        a: text,
                        analysis
                    };

                    // 2. Update Knowledge Base
                    const newKB = [...(knowledgeBase || []), newItem];
                    setKnowledgeBase(newKB);

                    // 3. Sync Briefing Text
                    const briefingText = newKB.map(item => `[P]: ${item.q}\n[R]: ${item.a}`).join('\n\n');
                    setConfig({
                        briefing: briefingText,
                        // Clear the gap
                        pendingGaps: { ...pendingGaps, [cleanManagerPhone]: null }
                    });

                    // 4. (Optional) Auto-notify the original user that the answer is ready
                    // We'll leave this for the UI/User manual trigger for now to avoid spam
                    console.log('AURA Loop: Brain updated with new knowledge!');

                    // Dispatch event for UI feedback
                    window.dispatchEvent(new CustomEvent('aura-brain-updated', { detail: newItem }));

                } catch (error) {
                    console.error('AURA Loop: Error resolving knowledge gap:', error);
                }
            }
        };

        // Expose globally so the main socket listener can trigger it
        window.__aura_handle_manager_message = handleNewManagerMessage;

        return () => {
            delete window.__aura_handle_manager_message;
        };
    }, [managerPhone, pendingGaps, knowledgeBase, setKnowledgeBase, setConfig]);
}
