import { useCallback, useEffect, useRef, useState } from 'react';
import WhatsAppService from '../services/whatsapp';
import { useStore } from '../store/useStore';
import { persistThreadMessages } from '../services/tenantData';

export function useChatThread({ activeChat, messages, setMessages, clearMessages }) {
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const activeJidRef = useRef(null);
    const isFirstLoadRef = useRef(true);
    const tenantId = useStore((state) => state.tenantId);

    const loadMessages = useCallback(async () => {
        const jid = activeChat?.chatJid || activeChat?.sendTargetJid || activeChat?.remoteJid || activeChat?.jid || activeChat?.id;
        if (!jid) return;

        setLoading(true);
        try {
            const linkedLid = activeChat.linkedLid || null;
            const sourceInstance = activeChat.sourceInstanceName || null;
            const data = await WhatsAppService.fetchMessages(jid, linkedLid, activeChat, sourceInstance);
            if (activeJidRef.current === (activeChat?.id || jid)) {
                setMessages(jid, data || []);
                if (tenantId) {
                    persistThreadMessages({
                        tenantId,
                        chat: activeChat,
                        messages: data || [],
                    }).catch((error) => {
                        console.error('AURA message sync error:', error);
                    });
                }
            }
        } catch (error) {
            console.error('AURA ChatArea v6 Error:', error);
        } finally {
            setLoading(false);
        }
    }, [activeChat, setMessages, tenantId]);

    useEffect(() => {
        if (isFirstLoadRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            isFirstLoadRef.current = false;
        }
    }, [messages]);

    useEffect(() => {
        const jid = activeChat?.id || activeChat?.chatJid;
        activeJidRef.current = jid;
        isFirstLoadRef.current = true;
        clearMessages();

        if (!jid) return;

        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [activeChat?.id, activeChat?.chatJid, clearMessages, loadMessages]);

    return {
        loading,
        messagesEndRef,
        loadMessages,
    };
}
