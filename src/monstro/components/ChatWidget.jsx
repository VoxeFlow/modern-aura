import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Bem-vindo ao Protocolo. Como posso ajudar sua transformação hoje?", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Simulação de presença e mensagem automática após 10s
    useEffect(() => {
        const timer = setTimeout(() => {
            if (messages.length === 1 && !isOpen) {
                setMessages(prev => [...prev, { id: 2, text: "Tem alguma dúvida sobre os resultados?", sender: 'bot' }]);
                // Opcional: tocar som ou abrir automaticamente
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [messages.length, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newMsg = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, newMsg]);
        setInputValue("");

        // Resposta automática simples (Placeholder para IA futura)
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Entendi. Um especialista vai analisar seu caso. Clique abaixo para continuar no WhatsApp.",
                sender: 'bot',
                isAction: true
            }]);
        }, 1500);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Botão Flutuante */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-monstro-primary text-black p-4 rounded-full shadow-glow hover:scale-110 transition-transform duration-300 flex items-center justify-center animate-pulse"
                >
                    <MessageCircle size={32} strokeWidth={2.5} />
                    {messages.length > 1 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            1
                        </span>
                    )}
                </button>
            )}

            {/* Janela de Chat */}
            {isOpen && (
                <div className="glass-panel w-80 sm:w-96 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in bg-[#121212]">
                    {/* Header */}
                    <div className="bg-monstro-primary/10 p-4 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-monstro-primary flex items-center justify-center text-black font-bold text-lg">
                                M
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">O MONSTRO</h4>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-monstro-text-dim">Online agora</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[400px] min-h-[300px] scrollable">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-3 text-sm rounded-2xl ${msg.sender === 'user'
                                            ? 'bg-monstro-primary text-black rounded-tr-none font-medium'
                                            : 'bg-white/10 text-white rounded-tl-none'
                                        }`}
                                >
                                    {msg.text}
                                    {msg.isAction && (
                                        <button className="mt-3 w-full bg-[#25D366] text-white py-2 px-3 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors">
                                            <MessageCircle size={14} /> Falar no WhatsApp
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/5 bg-black/20">
                        <div className="flex bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-monstro-primary/50 transition-colors">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-white/30"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim()}
                                className="ml-2 text-monstro-primary disabled:opacity-30 hover:scale-110 transition-transform"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
