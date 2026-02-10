import { useCallback, useEffect, useRef, useState } from 'react';
import WhatsAppService from '../services/whatsapp';

export function useChatThread({ activeChat, messages, setMessages, clearMessages }) {
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const activeJidRef = useRef(null);
    const isFirstLoadRef = useRef(true);

    const loadMessages = useCallback(async () => {
        const jid = activeChat?.id;
        if (!jid) return;

        setLoading(true);
        try {
            const linkedLid = activeChat.linkedLid || null;
            const data = await WhatsAppService.fetchMessages(jid, linkedLid, activeChat);
            if (activeJidRef.current === jid) {
                setMessages(jid, data || []);
            }
        } catch (error) {
            console.error('AURA ChatArea v6 Error:', error);
        } finally {
            setLoading(false);
        }
    }, [activeChat, setMessages]);

    useEffect(() => {
        if (isFirstLoadRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            isFirstLoadRef.current = false;
        }
    }, [messages]);

    useEffect(() => {
        const jid = activeChat?.id;
        activeJidRef.current = jid;
        isFirstLoadRef.current = true;
        clearMessages();

        if (!jid) return;

        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [activeChat?.id, clearMessages, loadMessages]);

    return {
        loading,
        messagesEndRef,
        loadMessages,
    };
}
