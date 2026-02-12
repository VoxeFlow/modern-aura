import React from 'react';
import AudioPlayer from './AudioPlayer';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';
import { resolveRenderedMessage } from '../utils/chatArea';
import { formatMessageTime, getMessageDateGroup } from '../utils/formatter';

const MessageList = ({ messages, loading, messagesEndRef }) => {
    // Determine sort order. Assuming 'messages' prop is Newest-First (standard for chat apps storage),
    // we reverse it for display (Oldest at top, Newest at bottom).
    const sortedMessages = Array.isArray(messages) ? [...messages].reverse() : [];

    return (
        <div className="thread scrollable">
            {sortedMessages.map((message, index) => {
                const parsed = resolveRenderedMessage(message);
                let displayContent = parsed.displayContent;
                let mediaElement = null;

                if (parsed.mediaType === 'audio') {
                    mediaElement = (
                        <div className="audio-message">
                            <AudioPlayer messageKey={message.key} mimeType={parsed.mimeType} />
                            {parsed.transcription && (
                                <p className="transcription" style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                                    🎵 {parsed.transcription}
                                </p>
                            )}
                        </div>
                    );
                } else if (parsed.mediaType === 'image') {
                    mediaElement = <ImageViewer messageKey={message.key} caption={parsed.imageCaption} mimeType={parsed.mimeType} />;
                } else if (parsed.mediaType === 'document') {
                    mediaElement = (
                        <DocumentViewer
                            messageKey={message.key}
                            fileName={parsed.fileName}
                            mimeType={parsed.mimeType}
                        />
                    );
                }

                if (!displayContent && !mediaElement && !message.key) return null;
                const messageKey = message?.key?.id || `${message?.messageTimestamp || 'ts'}-${index}`;
                const isFromMe = Boolean(message?.key?.fromMe || message?.fromMe);

                // Date Grouping Logic
                const messageDate = getMessageDateGroup(message.messageTimestamp);
                const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
                const previousDate = previousMessage ? getMessageDateGroup(previousMessage.messageTimestamp) : null;
                const showDateSeparator = messageDate !== previousDate;

                // Time Formatting
                const formattedTime = formatMessageTime(message.messageTimestamp);

                return (
                    <React.Fragment key={messageKey}>
                        {showDateSeparator && (
                            <div className="date-separator">
                                <span>{messageDate}</span>
                            </div>
                        )}
                        <div className={`message ${isFromMe ? 'out' : 'in'}`}>
                            {mediaElement || displayContent}
                            <span className="msg-time">{formattedTime}</span>
                        </div>
                    </React.Fragment>
                );
            })}
            {loading && messages.length === 0 && <p className="loading-txt">Carregando histórico...</p>}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
