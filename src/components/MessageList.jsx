import AudioPlayer from './AudioPlayer';
import ImageViewer from './ImageViewer';
import { resolveRenderedMessage } from '../utils/chatArea';

const MessageList = ({ messages, loading, messagesEndRef }) => {
    return (
        <div className="thread scrollable">
            {Array.isArray(messages) && [...messages].reverse().map((message, index) => {
                const parsed = resolveRenderedMessage(message);
                let displayContent = parsed.displayContent;
                let mediaElement = null;

                if (parsed.mediaType === 'audio') {
                    mediaElement = (
                        <div className="audio-message">
                            <AudioPlayer messageKey={message.key} />
                            {parsed.transcription && (
                                <p className="transcription" style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                                    🎵 {parsed.transcription}
                                </p>
                            )}
                        </div>
                    );
                } else if (parsed.mediaType === 'image') {
                    mediaElement = <ImageViewer messageKey={message.key} caption={parsed.imageCaption} />;
                }

                if (!displayContent && !mediaElement && !message.key) return null;
                const messageKey = message?.key?.id || `${message?.messageTimestamp || 'ts'}-${index}`;
                const isFromMe = Boolean(message?.key?.fromMe || message?.fromMe);

                return (
                    <div key={messageKey} className={`message ${isFromMe ? 'out' : 'in'}`}>
                        {mediaElement || displayContent}
                    </div>
                );
            })}
            {loading && messages.length === 0 && <p className="loading-txt">Carregando histórico...</p>}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
