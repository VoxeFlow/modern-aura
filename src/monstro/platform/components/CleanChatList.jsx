import React from 'react';
import { useStore } from '../../../store/useStore';
import { Search } from 'lucide-react';

export const CleanChatList = () => {
    const { chats, activeChat, setActiveChat } = useStore();

    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar lead..."
                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-monstro-primary"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {!chats || chats.length === 0 ? (
                    <div className="text-center p-8 text-xs text-gray-400">
                        Nenhuma conversa encontrada.
                    </div>
                ) : (
                    chats.map((chat) => (
                        <div
                            key={chat.id || chat.jid}
                            onClick={() => setActiveChat(chat)}
                            className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat?.id === chat.id ? 'bg-green-50/50 border-l-4 border-l-monstro-primary' : 'border-l-4 border-l-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-bold text-sm truncate pr-2 ${activeChat?.id === chat.id ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {chat.name || chat.pushName || chat.remoteJid.split('@')[0]}
                                </h4>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {formatTime(chat.messageTimestamp || chat.lastMessage?.messageTimestamp)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate h-4">
                                {chat.lastMessage?.message?.conversation || 'Imagem ou Áudio'}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
