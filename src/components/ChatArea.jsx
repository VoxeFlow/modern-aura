import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useChatDialogs } from '../hooks/useChatDialogs';
import { useChatComposer } from '../hooks/useChatComposer';
import { useChatAI } from '../hooks/useChatAI';
import { useChatThread } from '../hooks/useChatThread';
import { useChatActions } from '../hooks/useChatActions.jsx';
import ChatDialogModal from './ChatDialogModal';
import ChatMobileAnalysisOverlay from './ChatMobileAnalysisOverlay';
import MessageList from './MessageList';
import ChatInsightsPanel from './ChatInsightsPanel';
import ChatHeader from './ChatHeader';
import ChatComposer from './ChatComposer';
import ChatEmptyState from './ChatEmptyState';

const ChatArea = ({ isArchived = false, onBack }) => {
    const { activeChat, messages, setMessages, clearMessages, briefing, setActiveChat, chatTags, tags } = useStore();

    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false); // Mobile Analysis Overlay state
    const { suggestion, analysisData, isEnhancing, handleAnalyze, handleEnhance } = useChatAI({
        activeChat,
        messages,
        briefing,
        setInput,
    });

    const {
        dialog,
        dialogInput,
        setDialogInput,
        openConfirm,
        openPrompt,
        handleDialogClose,
        handleDialogConfirm,
    } = useChatDialogs();

    const { loading, messagesEndRef, loadMessages } = useChatThread({
        activeChat,
        messages,
        setMessages,
        clearMessages,
    });

    const {
        recording,
        handleMicClick,
        handleSend,
        useSuggestion,
        handleAttachmentClick,
    } = useChatComposer({
        activeChat,
        input,
        setInput,
        suggestion,
        sending,
        setSending,
        loadMessages,
        setShowAttachMenu,
        openConfirm,
        openPrompt,
    });

    const { handleTag, handleManualFix, handleUnarchive, handleArchive } = useChatActions({
        activeChat,
        openConfirm,
        setActiveChat,
    });

    if (!activeChat) {
        return <ChatEmptyState />;
    }

    return (
        <main className="chat-area" style={{ position: 'relative' }}>
            <ChatDialogModal
                dialog={dialog}
                dialogInput={dialogInput}
                setDialogInput={setDialogInput}
                handleDialogClose={handleDialogClose}
                handleDialogConfirm={handleDialogConfirm}
            />

            <ChatMobileAnalysisOverlay
                isOpen={isAnalysisOpen}
                onClose={() => setIsAnalysisOpen(false)}
                analysisData={analysisData}
                handleAnalyze={handleAnalyze}
            />

            <ChatHeader
                activeChat={activeChat}
                chatTags={chatTags}
                tags={tags}
                isArchived={isArchived}
                onBack={onBack}
                onOpenAnalysis={() => setIsAnalysisOpen(true)}
                onTag={handleTag}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onManualFix={handleManualFix}
            />

            <div className="main-grid">
                <div className="messages-column glass-panel">
                    <MessageList messages={messages} loading={loading} messagesEndRef={messagesEndRef} />

                    <ChatComposer
                        showAttachMenu={showAttachMenu}
                        setShowAttachMenu={setShowAttachMenu}
                        handleAttachmentClick={handleAttachmentClick}
                        handleSend={handleSend}
                        input={input}
                        setInput={setInput}
                        handleEnhance={handleEnhance}
                        isEnhancing={isEnhancing}
                        sending={sending}
                        recording={recording}
                        handleMicClick={handleMicClick}
                    />
                </div>

                <ChatInsightsPanel
                    analysisData={analysisData}
                    suggestion={suggestion}
                    handleAnalyze={handleAnalyze}
                    useSuggestion={useSuggestion}
                />
            </div>
        </main >
    );
};

export default ChatArea;
