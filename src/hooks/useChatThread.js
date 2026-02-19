import { useCallback, useEffect, useRef, useState } from 'react';
import WhatsAppService from '../services/whatsapp';
import { useStore } from '../store/useStore';
import { persistThreadMessages } from '../services/tenantData';

export function useChatThread({ activeChat, messages, setMessages, clearMessages }) {
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const activeJidRef = useRef(null);
    const isFirstLoadRef = useRef(true);
    const inFlightRef = useRef(false);
    const lastSignatureRef = useRef('');
    const tenantId = useStore((state) => state.tenantId);

    const buildSignature = (items = []) => {
        return (Array.isArray(items) ? items : [])
            .slice(0, 100)
            .map((item) => {
                const id = String(item?.key?.id || item?.id || item?.messageTimestamp || '');
                const ts = Number(item?.messageTimestamp || 0);
                return `${id}:${ts}`;
            })
            .join('|');
    };

    const loadMessages = useCallback(async () => {
        const jid = activeChat?.chatJid || activeChat?.sendTargetJid || activeChat?.remoteJid || activeChat?.jid || activeChat?.id;
        if (!jid || inFlightRef.current) return;

        inFlightRef.current = true;
        setLoading(true);
        try {
            const linkedLid = activeChat.linkedLid || null;
            const sourceInstance = activeChat.sourceInstanceName || null;
            const data = await WhatsAppService.fetchMessages(
                jid,
                linkedLid,
                activeChat,
                sourceInstance,
                { limit: 120 }
            );
            const signature = buildSignature(data || []);
            const hasChanged = signature !== lastSignatureRef.current;
            if (activeJidRef.current === (activeChat?.id || jid)) {
                if (hasChanged) {
                    setMessages(jid, data || []);
                    lastSignatureRef.current = signature;
                }
                if (tenantId && hasChanged) {
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
            inFlightRef.current = false;
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
        lastSignatureRef.current = '';
        clearMessages();

        if (!jid) return;

        loadMessages();
        const interval = setInterval(() => {
            if (document.hidden) return;
            loadMessages();
        }, 12000);
        return () => clearInterval(interval);
    }, [activeChat?.id, activeChat?.chatJid, clearMessages, loadMessages]);

    return {
        loading,
        messagesEndRef,
        loadMessages,
    };
}
