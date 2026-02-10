import React, { useRef } from 'react';
import { Paperclip, Wand2, Send, Mic, Image, Camera, FileText } from 'lucide-react';

const ChatComposer = ({
    showAttachMenu,
    setShowAttachMenu,
    handleFileSelect,
    handleAttachmentMenuOpen,
    handleSend,
    input,
    setInput,
    handleEnhance,
    isEnhancing,
    sending,
    recording,
    handleMicClick,
}) => {
    const fileInputRef = useRef(null);

    const handleOptionClick = (type) => {
        if (!fileInputRef.current) return;

        // Configure input based on type
        if (type === 'Fotos/Vídeos') {
            fileInputRef.current.accept = 'image/*,video/*';
            fileInputRef.current.removeAttribute('capture');
        } else if (type === 'Documento') {
            fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.xlsx,.xls';
            fileInputRef.current.removeAttribute('capture');
        } else if (type === 'Câmera') {
            fileInputRef.current.accept = 'image/*';
            fileInputRef.current.capture = 'environment';
        }

        setShowAttachMenu(false);
        // Small timeout to ensure menu closes visually before system dialog opens (optional but smoother)
        setTimeout(() => {
            fileInputRef.current.click();
        }, 50);
    };

    return (
        <form className="message-input-area" onSubmit={handleSend} style={{ position: 'relative' }}>
            {/* Hidden Permanent File Input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {showAttachMenu && (
                <div
                    className="attach-menu glass-panel"
                    style={{
                        position: 'absolute',
                        bottom: '75px',
                        left: '12px',
                        background: 'rgba(18, 18, 18, 0.98)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(197, 160, 89, 0.15)',
                        borderRadius: '24px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        zIndex: 1000,
                        minWidth: '220px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transformOrigin: 'bottom left'
                    }}
                >
                    <button
                        type="button"
                        className="menu-item-v5"
                        onClick={() => handleOptionClick('Fotos/Vídeos')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '14px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '14px 18px',
                            fontSize: '15px',
                            fontWeight: '600',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '16px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.15)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ffffff'; }}
                    >
                        <Image size={22} style={{ color: 'var(--accent-primary)' }} />
                        <span>Fotos e Vídeos</span>
                    </button>

                    <button
                        type="button"
                        className="menu-item-v5"
                        onClick={() => handleOptionClick('Câmera')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '14px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '14px 18px',
                            fontSize: '15px',
                            fontWeight: '600',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '16px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.15)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ffffff'; }}
                    >
                        <Camera size={22} style={{ color: 'var(--accent-primary)' }} />
                        <span>Usar Câmera</span>
                    </button>

                    <button
                        type="button"
                        className="menu-item-v5"
                        onClick={() => handleOptionClick('Documento')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '14px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '14px 18px',
                            fontSize: '15px',
                            fontWeight: '600',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '16px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.15)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ffffff'; }}
                    >
                        <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
                        <span>Documento</span>
                    </button>
                </div>
            )}

            <button
                type="button"
                className="btn-icon"
                onClick={handleAttachmentMenuOpen}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 5px' }}
            >
                <Paperclip size={22} />
            </button>

            <div className="input-container-main">
                <button
                    type="button"
                    className={`btn-enhance ${input.trim() ? 'active' : ''}`}
                    onClick={() => handleEnhance(input)}
                    disabled={!input.trim() || isEnhancing || sending}
                    title="Aprimorar Resposta"
                >
                    <Wand2 size={18} className={isEnhancing ? 'spin' : ''} />
                </button>

                <input
                    type="text"
                    placeholder="Resposta persuasiva..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending || isEnhancing}
                />
            </div>

            {input.trim() ? (
                <button
                    type="submit"
                    disabled={sending || isEnhancing}
                    style={{
                        background: 'var(--accent-primary)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                    }}
                >
                    <Send size={20} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleMicClick}
                    style={{
                        background: recording ? '#ef4444' : 'var(--accent-primary)',
                        border: 'none',
                        color: recording ? '#fff' : '#000',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                >
                    <Mic size={20} className={recording ? 'pulse' : ''} />
                </button>
            )}
        </form>
    );
};

export default ChatComposer;
