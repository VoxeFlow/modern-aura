import React, { useEffect, useState, useRef } from 'react';
import { Zap, Bot, Send, Check, BarChart3, Target, Wand2, Paperclip, Mic, Image, FileText, Camera, Tag, Archive, ChevronLeft, X, Pencil } from 'lucide-react';
// Note: Removed Box since I'll use standard div to avoid extra dependencies if not installed
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { formatJid } from '../utils/formatter';
import AudioPlayer from './AudioPlayer';
import ImageViewer from './ImageViewer';

const ChatArea = ({ isArchived = false, onBack }) => {
    const { activeChat, messages, setMessages, clearMessages, briefing, setActiveChat, chatTags, tags } = useStore();

    // GUARD CLAUSE: If no chat is active, don't render anything
    if (!activeChat) return null;

    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [analysisData, setAnalysisData] = useState({ level: '', intent: '', strategy: '' });
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false); // Mobile Analysis Overlay state

    // DIALOG SYSTEM STATE
    const [dialog, setDialog] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null, inputPlaceholder: '' });
    const [dialogInput, setDialogInput] = useState('');

    const activeJidRef = useRef(null);

    const loadMessages = async () => {
        const jid = activeChat?.id;
        if (!jid) return;

        try {
            // v7.9 UNIFIED FETCH: Pass linkedLid to recover "missing" audios
            const linkedLid = activeChat.linkedLid || null;
            const data = await WhatsAppService.fetchMessages(jid, linkedLid);

            if (activeJidRef.current === jid) {
                setMessages(jid, data || []);
            }
        } catch (e) {
            console.error("AURA ChatArea v6 Error:", e);
        }
    };

    const messagesEndRef = useRef(null);
    const isFirstLoadRef = useRef(true); // Track if it's the first render for this chat

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        // Strictly only scroll to bottom on initial chat load
        if (isFirstLoadRef.current && messages.length > 0) {
            console.log("AURA: Performing initial scroll to bottom");
            scrollToBottom("auto");
            isFirstLoadRef.current = false;
        }
    }, [messages]);

    useEffect(() => {
        const jid = activeChat?.id;
        activeJidRef.current = jid;
        isFirstLoadRef.current = true; // Reset for new chat selection

        clearMessages();
        setSuggestion('');
        setInput('');
        setAnalysisData({ level: '', intent: '', strategy: '' });
        setShowAttachMenu(false);

        if (jid) {
            setLoading(true);
            loadMessages().then(() => setLoading(false));
            const interval = setInterval(loadMessages, 5000); // Reduced from 10s to 5s
            return () => clearInterval(interval);
        }
    }, [activeChat?.id]);

    const handleAnalyze = async () => {
        if (!activeChat) return;

        // Visual Feedback
        const WandIcon = document.querySelector('.btn-primary.v3-btn svg');
        if (WandIcon) WandIcon.style.animation = 'spin 1s linear infinite';

        try {
            // 1. EXTRACT STRUCTURED CONTEXT (ChatML Format)
            const rawName = activeChat.name || "";
            const isNumeric = /^\d+$/.test(rawName.replace(/\D/g, ''));
            const clientName = (isNumeric || rawName.includes('@') || !rawName) ? "Cliente" : rawName;

            const structuredHistory = messages.slice(-15).map(m => {
                const isMe = m.key?.fromMe || m.fromMe;
                const msg = m.message || {};
                const text = msg.conversation ||
                    msg.extendedTextMessage?.text ||
                    m.content ||
                    m.text ||
                    "";
                return {
                    role: isMe ? 'assistant' : 'user',
                    content: text
                };
            }).filter(m => m.content.trim() !== "");

            const lastClientMsg = [...messages].reverse().find(m => !(m.key?.fromMe || m.fromMe));
            const lastClientText = lastClientMsg?.message?.conversation ||
                lastClientMsg?.message?.extendedTextMessage?.text ||
                lastClientMsg?.content ||
                lastClientMsg?.text ||
                "";

            setSuggestion(`Aura Orquestrador v8.7: Sincronizando contexto completo v1.1.7...`);

            // 2. RAG ORCHESTRATION
            const RAGService = (await import('../services/rag')).default;
            const extraContext = await RAGService.getRelevantContext(lastClientText);

            // 3. GENERATE AI SUGGESTION
            const { default: OpenAIService } = await import('../services/openai');
            const aiRes = await OpenAIService.generateSuggestion({
                clientName,
                history: structuredHistory,
                extraContext,
                briefing: briefing || "Negócio de Alto Padrão"
            });

            if (aiRes) {
                // Metadata markers for visual context
                const lowerAi = aiRes.toLowerCase();
                let finalLevel = "Consciente da Solução";
                let finalIntent = "Interação Dinâmica";
                let finalStrategy = "Persuasão Adaptativa";

                if (lowerAi.includes('agenda') || lowerAi.includes('horário')) finalIntent = "Agendamento";
                if (lowerAi.includes('preço') || lowerAi.includes('valor')) finalIntent = "Financeiro";

                setAnalysisData({ level: finalLevel, intent: finalIntent, strategy: finalStrategy });
                setSuggestion(aiRes.trim());
            } else {
                setSuggestion("Não foi possível gerar uma sugestão no momento. Tente novamente.");
            }
        } catch (e) {
            console.error("AURA Analysis Error:", e);
            setSuggestion("Ops! Ocorreu um erro na análise inteligente.");
        } finally {
            if (WandIcon) WandIcon.style.animation = 'none';
        }
    };

    const handleEnhance = async () => {
        if (!input.trim() || isEnhancing) return;

        setIsEnhancing(true);
        const originalInput = input;
        setInput("✨ Aura refinando sua mensagem...");

        try {
            // Use AI to enhance the message
            const { default: OpenAIService } = await import('../services/openai');
            const enhanced = await OpenAIService.enhanceMessage(originalInput, { briefing });

            if (enhanced && enhanced !== originalInput) {
                setInput(enhanced);
            } else {
                // Fallback to original if AI fails
                setInput(originalInput);
            }
        } catch (e) {
            console.error("AURA Enhance Error:", e);
            setInput(originalInput); // Restore original on error
        } finally {
            setIsEnhancing(false);
        }
    };

    // AUDIO RECORDER LOGIC
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleMicClick = async () => {
        if (recording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
                    const audioFile = new File([audioBlob], "voice_message.mp3", { type: 'audio/mp4' });

                    setSending(true);
                    try {
                        console.log("AURA: Sending Voice Message...");
                        await WhatsAppService.sendMedia(activeChat.id, audioFile, "", true);
                        loadMessages();
                    } catch (e) {
                        console.error("Audio Send Error:", e);
                        alert("❌ Erro ao enviar áudio.");
                    } finally {
                        setSending(false);
                    }

                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setRecording(true);
            } catch (err) {
                console.error("Mic Access Error:", err);
                alert("❌ Erro ao acessar microfone. Verifique as permissões.");
            }
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const jid = activeChat?.id;
        if (!input.trim() || sending || !jid) return;

        setSending(true);
        try {
            // Pass activeChat to enable phone number extraction from metadata
            const res = await WhatsAppService.sendMessage(jid, input, activeChat);

            // Check if message was sent successfully
            if (res && !res.error) {
                console.log("✅ Mensagem enviada com sucesso");
                setInput('');
                loadMessages();
            } else {
                // Show error to user
                const errorMsg = res?.message || 'Erro ao enviar mensagem';
                console.error("❌ Erro ao enviar:", errorMsg);
                openConfirm("Falha no Envio", `${errorMsg}\n\n💡 Dica: Use o botão de lápis (✏️) no topo para corrigir o número.`);
            }
        } catch (e) {
            console.error("AURA Send Error:", e);
            openConfirm("Erro", `Erro inesperado: ${e.message}`);
        }
        setSending(false);
    };

    const useSuggestion = () => {
        if (suggestion && !suggestion.includes('...')) {
            setInput(suggestion);
        }
    };

    // DIALOG HELPERS
    const openConfirm = (title, message, onConfirm) => {
        setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm, inputPlaceholder: '' });
    };

    const openPrompt = (title, initialValue, onConfirm) => {
        setDialogInput(initialValue || '');
        setDialog({ isOpen: true, type: 'prompt', title, message: '', onConfirm, inputPlaceholder: 'Digite aqui...' });
    };

    const handleDialogClose = () => {
        setDialog({ ...dialog, isOpen: false });
        setDialogInput('');
    };

    const handleDialogConfirm = () => {
        if (dialog.onConfirm) {
            dialog.onConfirm(dialog.type === 'prompt' ? dialogInput : true);
        }
        handleDialogClose();
    };

    // v7.11 REAL IMPLEMENTATIONS (Using Custom Dialogs)
    const handleTag = () => {
        const { setTag, tags } = useStore.getState();

        openConfirm(
            'Etiquetar Conversa',
            <div style={{ marginTop: '15px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    Selecione o estágio do lead:
                </label>
                <select
                    id="tagSelect"
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#1e293b',
                        color: '#ffffff',
                        fontSize: '14px',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    <option value="" style={{ color: '#94a3b8' }}>Selecione uma tag...</option>
                    {tags.map(tag => (
                        <option key={tag.id} value={tag.id} style={{ color: '#ffffff' }}>
                            {tag.icon} {tag.name}
                        </option>
                    ))}
                </select>
            </div>,
            () => {
                const select = document.getElementById('tagSelect');
                const tagId = select?.value;

                if (!tagId) {
                    alert('⚠️ Selecione uma tag válida!');
                    return;
                }

                setTag(activeChat.id, tagId);
                alert('✅ Tag aplicada com sucesso!');
            }
        );
    };

    const handleArchive = () => {
        const { setActiveChat } = useStore.getState();
        const archived = JSON.parse(localStorage.getItem('archived_chats') || '[]');
        const isArchived = archived.includes(activeChat.id);

        openConfirm(
            isArchived ? 'Desarquivar Conversa?' : 'Arquivar Conversa?',
            `Deseja realmente ${isArchived ? 'desarquivar' : 'arquivar'} a conversa com ${activeChat.name}?`,
            () => {
                if (isArchived) {
                    const updated = archived.filter(id => id !== activeChat.id);
                    localStorage.setItem('archived_chats', JSON.stringify(updated));
                    alert('✅ Conversa desarquivada!');
                } else {
                    archived.push(activeChat.id);
                    localStorage.setItem('archived_chats', JSON.stringify(archived));

                    // Clear active chat and show success message
                    setActiveChat(null);
                    alert('✅ Conversa arquivada! Acesse no Histórico.');
                }

                // Trigger chat list refresh
                window.dispatchEvent(new Event('storage'));
            }
        );
    };

    const handleAttachmentClick = async (type) => {
        setShowAttachMenu(false);
        console.log(`AURA: Attachment Clicked - ${type}`);

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        document.body.appendChild(input);

        if (type === 'Fotos/Vídeos') {
            input.accept = 'image/*,video/*';
        } else if (type === 'Documento') {
            input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.xls';
        } else if (type === 'Câmera') {
            input.accept = 'image/*';
            input.capture = 'environment';
        }

        input.onchange = async (e) => {
            const file = e.target.files[0];
            document.body.removeChild(input);
            if (!file) return;

            openPrompt(`Enviar: ${file.name}`, '', async (caption) => {
                try {
                    setSending(true);
                    const res = await WhatsAppService.sendMedia(activeChat.id, file, caption || '');
                    if (res) {
                        loadMessages();
                    } else {
                        console.error("Upload failed result:", res);
                    }
                } catch (err) {
                    console.error('Upload error:', err);
                } finally {
                    setSending(false);
                }
            });
        };

        setTimeout(() => input.click(), 50);
    };

    if (!activeChat) {
        return (
            <div className="empty-dashboard">
                <Bot size={64} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
                <h2>AURA v3 Dashboard</h2>
                <p>Selecione um cliente para iniciar a consultoria de vendas</p>
            </div>
        );
    }

    return (
        <main className="chat-area" style={{ position: 'relative' }}>
            {/* CUSTOM DIALOG MODAL */}
            {dialog.isOpen && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{ padding: '20px', width: '300px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: '#0f172a' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>{dialog.title}</h4>
                        {dialog.message && <p style={{ color: '#ccc', marginBottom: '15px' }}>{dialog.message}</p>}

                        {dialog.type === 'prompt' && (
                            <input
                                type="text"
                                value={dialogInput}
                                onChange={(e) => setDialogInput(e.target.value)}
                                placeholder={dialog.inputPlaceholder}
                                style={{
                                    width: '100%', padding: '8px', borderRadius: '6px',
                                    border: '1px solid #334155', background: '#1e293b', color: '#fff',
                                    marginBottom: '15px'
                                }}
                                autoFocus
                            />
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={handleDialogClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleDialogConfirm} style={{ padding: '8px 16px', background: 'var(--accent-primary)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE ANALYSIS OVERLAY */}
            {isAnalysisOpen && (
                <div className="sidebar-overlay open" onClick={() => setIsAnalysisOpen(false)} style={{ zIndex: 2000 }}>
                    <div
                        className="glass-panel"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            maxHeight: '80vh',
                            borderTopLeftRadius: '25px',
                            borderTopRightRadius: '25px',
                            padding: '30px 20px',
                            overflowY: 'auto'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ width: '40px', height: '5px', background: '#ccc', borderRadius: '5px', margin: '0 auto 20px auto' }} onClick={() => setIsAnalysisOpen(false)} />
                        <h2 style={{ marginBottom: '20px', fontSize: '20px', textAlign: 'center' }}>Análise Estratégica</h2>

                        {analysisData.level ? (
                            <div className="analysis-content">
                                <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                                    <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Nível de Consciência</h4>
                                    <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.level}</p>
                                </div>
                                <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                                    <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Intenção do Lead</h4>
                                    <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.intent}</p>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                                    <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Estratégia Recomendada</h4>
                                    <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.strategy}</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                                <Bot size={40} style={{ marginBottom: '10px' }} />
                                <p>Nenhuma análise disponível.<br />Clique em "Analisar Conversa" abaixo.</p>
                            </div>
                        )}

                        <button
                            className="btn-primary v3-btn"
                            onClick={() => { handleAnalyze(); setIsAnalysisOpen(false); }}
                            style={{ width: '100%', marginTop: '30px', height: '54px', borderRadius: '16px', fontWeight: 'bold' }}
                        >
                            <Wand2 size={20} /> Analisar agora
                        </button>
                    </div>
                </div>
            )}

            <header className="chat-header glass-panel">
                <div className="active-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            className="mobile-back-btn"
                            onClick={onBack}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'none', marginRight: '5px' }}
                        >
                            <ChevronLeft size={24} color="var(--accent-primary)" />
                        </button>
                        <h3 style={{ margin: 0 }}>
                            {(() => {
                                const identity = WhatsAppService.resolveIdentity(activeChat.id, activeChat);
                                return identity.displayName || formatJid(activeChat.id);
                            })()}
                        </h3>
                        {chatTags[activeChat.id] && (() => {
                            const tag = tags.find(t => t.id === chatTags[activeChat.id]);
                            if (tag) {
                                return (
                                    <span style={{
                                        fontSize: '11px',
                                        background: tag.color + '33', // 20% opacity
                                        color: tag.color,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: `1px solid ${tag.color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: '600'
                                    }}>
                                        {tag.icon} {tag.name}
                                    </span>
                                );
                            }
                            return null;
                        })()}


                        <button
                            onClick={() => {
                                const identity = WhatsAppService.resolveIdentity(activeChat.id, activeChat);
                                const currentName = identity.name || "";
                                const currentPhone = identity.phone || "";

                                // Use React dialog instead of window.prompt
                                openPrompt("Editar Contato (Nome | Número)", `${currentName} | ${currentPhone}`, (input) => {
                                    if (!input) return;

                                    const parts = input.split('|').map(p => p.trim());
                                    const newName = parts[0] || "";
                                    const newPhone = parts[1] || "";

                                    let saved = false;

                                    if (newName && newName !== currentName) {
                                        WhatsAppService.setManualNameMapping(activeChat.id, newName);
                                        saved = true;
                                    }

                                    if (newPhone && /^\d{10,15}$/.test(newPhone)) {
                                        WhatsAppService.setManualPhoneMapping(activeChat.id, newPhone);
                                        saved = true;
                                    }

                                    if (saved) {
                                        window.location.reload();
                                    }
                                });
                            }}
                            className="icon-btn"
                            title="Editar Contato"
                            style={{
                                marginLeft: '8px',
                                padding: '4px',
                                background: 'rgba(255,100,100,0.1)',
                                color: 'var(--accent-primary)',
                                borderRadius: '50%',
                                border: '1px solid rgba(255,100,100,0.3)'
                            }}
                        >
                            <Pencil size={14} />
                        </button>
                    </div>
                </div>
                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        className="mobile-analysis-btn"
                        onClick={() => setIsAnalysisOpen(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'none', cursor: 'pointer', padding: '5px' }}
                    >
                        <Wand2 size={22} />
                    </button>
                    {isArchived ? (
                        <button
                            className="icon-btn"
                            title="Desarquivar"
                            onClick={() => {
                                const archived = JSON.parse(localStorage.getItem('archived_chats') || '[]');
                                const updated = archived.filter(id => id !== activeChat.id);
                                localStorage.setItem('archived_chats', JSON.stringify(updated));
                                window.dispatchEvent(new Event('storage'));
                                alert('✅ Conversa desarquivada!');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
                        >
                            <Archive size={20} />
                        </button>
                    ) : (
                        <>
                            <button
                                className="icon-btn"
                                title="Etiquetar"
                                onClick={handleTag}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <Tag size={20} />
                            </button>
                            <button
                                className="icon-btn"
                                title="Arquivar"
                                onClick={() => {
                                    const archived = JSON.parse(localStorage.getItem('archived_chats') || '[]');
                                    if (!archived.includes(activeChat.id)) {
                                        archived.push(activeChat.id);
                                        localStorage.setItem('archived_chats', JSON.stringify(archived));
                                        window.dispatchEvent(new Event('storage'));
                                        setActiveChat(null);
                                        alert('✅ Conversa arquivada!');
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <Archive size={20} />
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="main-grid">
                <div className="messages-column glass-panel">
                    <div className="thread scrollable">
                        {Array.isArray(messages) && [...messages].reverse().map((m, i) => {
                            const msg = m.message || {};
                            const content = msg.conversation ||
                                msg.extendedTextMessage?.text ||
                                msg.imageMessage?.caption ||
                                msg.videoMessage?.caption ||
                                m.content || m.text || "";

                            // Media detection logic
                            let displayContent = content;
                            let mediaElement = null;

                            if (!content) {
                                if (msg.audioMessage) {
                                    const transcription = msg.audioMessage?.contextInfo?.transcription ||
                                        msg.audioMessage?.transcription ||
                                        m.transcription;

                                    // Create audio player
                                    mediaElement = (
                                        <div className="audio-message">
                                            <AudioPlayer messageKey={m.key} />
                                            {transcription && <p className="transcription" style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>🎵 {transcription}</p>}
                                        </div>
                                    );
                                }
                                else if (msg.imageMessage) {
                                    mediaElement = <ImageViewer messageKey={m.key} caption={msg.imageMessage.caption} />;
                                }
                                else if (msg.videoMessage) displayContent = "(Vídeo 🎥)";
                                else if (msg.documentMessage) displayContent = "(Documento 📄)";
                                else if (msg.stickerMessage) displayContent = "(Figurinha ✨)";
                                else if (msg.locationMessage) displayContent = "(Localização 📍)";
                                else if (msg.contactMessage) displayContent = "(Contato 👤)";
                                else displayContent = "(Mídia)";
                            }

                            if (!displayContent && !mediaElement && !m.key) return null;

                            return (
                                <div key={i} className={`message ${m.key?.fromMe ? 'out' : 'in'}`}>
                                    {mediaElement || displayContent}
                                </div>
                            );
                        })}
                        {loading && messages.length === 0 && <p className="loading-txt">Carregando histórico...</p>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* MOBILE SUGGESTION CARD - REMOVED PER USER REQUEST */}
                    {/* {suggestion && !suggestion.includes('...') && (
                        <div className="mobile-suggestion-card glass-panel">
                            <div className="suggestion-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Bot size={16} color="var(--accent-primary)" />
                                    <span>Sugestão Aura</span>
                                </div>
                                <button className="close-suggestion" onClick={() => setSuggestion('')}>
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="suggestion-text">{suggestion}</p>
                            <button className="use-suggestion-btn" onClick={useSuggestion}>
                                Usar Sugestão
                            </button>
                        </div>
                    )} */}

                    <form className="message-input-area" onSubmit={handleSend} style={{ position: 'relative' }}>

                        {/* Attachment Menu Popup */}
                        {showAttachMenu && (
                            <div className="attach-menu" style={{
                                position: 'absolute',
                                bottom: '60px',
                                left: '10px',
                                background: '#1e293b', // Solid dark background
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px', // Increased gap for better separation
                                zIndex: 100,
                                minWidth: '200px', // Slightly wider
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}>
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
                                        color: '#f8fafc', // High contrast text
                                        cursor: 'pointer',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        textAlign: 'left',
                                        width: '100%',
                                        borderRadius: '8px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                onClick={handleEnhance}
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
                                    flexShrink: 0
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
                                    flexShrink: 0
                                }}
                            >
                                <Mic size={20} className={recording ? 'pulse' : ''} />
                            </button>
                        )}
                    </form>
                </div>

                <div className="analysis-column">
                    <div className="card glass-panel v3-analysis">
                        <div className="card-header-v3">
                            <BarChart3 size={18} />
                            <h4>Análise de Vendas</h4>
                        </div>

                        <div className="v3-data-grid">
                            <div className="data-item">
                                <label>Consciência</label>
                                <span>{analysisData.level || "—"}</span>
                            </div>
                            <div className="data-item">
                                <label>Intenção Principal</label>
                                <span>{analysisData.intent || "—"}</span>
                            </div>
                            <div className="data-item">
                                <label>Estratégia</label>
                                <span>{analysisData.strategy || "—"}</span>
                            </div>
                        </div>

                        <button className="btn-primary v3-btn" onClick={handleAnalyze}>
                            Analisar Histórico
                        </button>
                    </div>

                    <div className="card glass-panel suggestion v3-suggestion">
                        <div className="card-header-v3">
                            <Target size={18} />
                            <h4>Resposta Sugerida</h4>
                        </div>
                        <div className="result-box v3-box">
                            {suggestion || "Aguardando análise estratégica..."}
                        </div>
                        {suggestion && !suggestion.includes('...') && (
                            <button className="btn-secondary v3-btn-sub" onClick={useSuggestion}>
                                <Check size={16} /> Usar esta sugestão
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </main >
    );
};

export default ChatArea;
