import React from 'react';
import { Paperclip, Wand2, Send, Mic, Image, Camera, FileText } from 'lucide-react';

const ChatComposer = ({
    showAttachMenu,
    setShowAttachMenu,
    handleAttachmentClick,
    handleSend,
    input,
    setInput,
    handleEnhance,
    isEnhancing,
    sending,
    recording,
    handleMicClick,
}) => {
    return (
        <form className="message-input-area" onSubmit={handleSend} style={{ position: 'relative' }}>
            {showAttachMenu && (
                <div
                    className="attach-menu"
                    style={{
                        position: 'absolute',
                        bottom: '60px',
                        left: '10px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        zIndex: 100,
                        minWidth: '200px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAttachmentClick('Fotos/Vídeos')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            padding: '10px 12px',
                            fontSize: '14px',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ background: '#ec4899', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                            <Image size={18} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 500 }}>Fotos e Vídeos</span>
                    </button>
                    <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAttachmentClick('Câmera')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            padding: '10px 12px',
                            fontSize: '14px',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ background: '#ef4444', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                            <Camera size={18} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 500 }}>Câmera</span>
                    </button>
                    <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAttachmentClick('Documento')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            padding: '10px 12px',
                            fontSize: '14px',
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ background: '#8b5cf6', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                            <FileText size={18} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 500 }}>Documento</span>
                    </button>
                </div>
            )}

            <button
                type="button"
                className="btn-icon"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
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
