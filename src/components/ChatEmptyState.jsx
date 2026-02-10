import React from 'react';
import { Bot } from 'lucide-react';

const ChatEmptyState = () => {
    return (
        <div className="empty-dashboard">
            <Bot size={64} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
            <h2>AURA v3 Dashboard</h2>
            <p>Selecione um cliente para iniciar a consultoria de vendas</p>
        </div>
    );
};

export default ChatEmptyState;
