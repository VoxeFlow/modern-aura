import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import WhatsAppService from '../../../services/whatsapp';
import { Send, Image, Mic } from 'lucide-react';
import { NeonButton } from '../../components/NeonButton';

export const CleanChatWindow = () => {
    const { activeChat, messages, setMessages, appendPendingOutgoing, instanceName } = useStore();
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!activeChat) return;

        const loadMsgs = async () => {
            const jid = activeChat.id || activeChat.jid || activeChat.remoteJid;
            const msgs = await WhatsAppService.fetchMessages(jid);
            if (msgs) setMessages(jid, msgs);
        };

        loadMsgs();
        // Polling for new messages just in case socket misses
    }, [activeChat, instanceName, setMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !activeChat) return;
        setSending(true);
        const text = inputText;
        setInputText('');

        try {
            const jid = activeChat.id || activeChat.jid || activeChat.remoteJid;

            // Optimistic update
            appendPendingOutgoing(jid, text);

            await WhatsAppService.request(`/message/sendText/${instanceName}`, 'POST', {
                number: jid,
                text: text
            });

            // Refresh messages after short delay
            setTimeout(async () => {
                const msgs = await WhatsAppService.fetchMessages(jid);
                if (msgs) setMessages(jid, msgs);
            }, 1500);

        } catch (e) {
            console.error("Send failed", e);
            alert("Erro ao enviar mensagem");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-16 border-b border-gray-100 flex items-center px-6 bg-white shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                    {activeChat.name?.charAt(0) || '?'}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 leading-tight">
                        {activeChat.name || activeChat.pushName || activeChat.remoteJid}
                    </h3>
                    <p className="text-xs text-green-500 font-medium">Ativo agora</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {messages.slice().reverse().map((msg, idx) => {
                    const isMe = msg.key?.fromMe;
                    return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                    ? 'bg-monstro-primary text-black rounded-tr-none'
                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                }`}>
                                {msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Mídia...'}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef}></div>
            </div>

            {/* Input - Footer */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl flex items-center p-2 gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <Image size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <Mic size={20} />
                    </button>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                        placeholder="Digite uma mensagem..."
                    />

                    <NeonButton
                        variant="primary"
                        onClick={handleSend}
                        className="!p-2 !rounded-xl !shadow-none"
                    >
                        <Send size={18} />
                    </NeonButton>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-gray-300 font-medium">
                        Pressione Enter para enviar
                    </span>
                </div>
            </div>
        </div>
    );
};
