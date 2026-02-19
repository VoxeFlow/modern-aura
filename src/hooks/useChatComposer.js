import { useCallback, useRef, useState } from 'react';
import WhatsAppService from '../services/whatsapp';
import { useStore } from '../store/useStore';
import { persistThreadMessages } from '../services/tenantData';

export function useChatComposer({
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
}) {
    const appendPendingOutgoing = useStore((state) => state.appendPendingOutgoing);
    const recordLearningEvent = useStore((state) => state.recordLearningEvent);
    const tenantId = useStore((state) => state.tenantId);
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioMimeTypeRef = useRef('');
    const outboundJid = activeChat?.chatJid || activeChat?.sendTargetJid || activeChat?.remoteJid || activeChat?.jid || activeChat?.id;

    const getPreferredAudioMimeType = () => {
        const candidates = [
            'audio/ogg;codecs=opus',
            'audio/webm;codecs=opus',
            'audio/webm',
        ];

        for (const candidate of candidates) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
                return candidate;
            }
        }

        return '';
    };

    const getAudioExtension = (mimeType) => {
        if (!mimeType) return 'webm';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'm4a';
        return 'bin';
    };

    const persistOutgoingEvent = useCallback(async ({ jid, text = '', response = null, kind = 'text' }) => {
        if (!tenantId || !activeChat || !jid) return;
        const synthetic = {
            key: {
                id: response?.key?.id || response?.id || `local-${Date.now()}`,
                fromMe: true,
                remoteJid: jid,
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            message: kind === 'text'
                ? { conversation: text || '' }
                : kind === 'audio'
                    ? { audioMessage: {} }
                    : kind === 'image'
                        ? { imageMessage: { caption: text || '' } }
                        : kind === 'video'
                            ? { videoMessage: { caption: text || '' } }
                            : kind === 'document'
                                ? { documentMessage: {} }
                                : { conversation: text || '' },
        };
        await persistThreadMessages({
            tenantId,
            chat: activeChat,
            messages: [synthetic],
        });
    }, [activeChat, tenantId]);

    const promptManualPhoneAndRetry = useCallback((jid, initialPhone, retryText, chatData) => {
        const initialDigits = String(initialPhone || '').replace(/\D/g, '');

        openPrompt(
            'Corrigir número do contato',
            initialDigits,
            async (typedPhone) => {
                const normalized = String(typedPhone || '').replace(/\D/g, '');
                if (!/^\d{10,15}$/.test(normalized)) {
                    openConfirm('Número inválido', 'Digite entre 10 e 15 números (somente dígitos).');
                    return;
                }

                const saved = WhatsAppService.setManualPhoneMapping(jid, normalized, chatData);
                if (!saved) {
                    openConfirm('Erro', 'Não foi possível salvar o número deste contato.');
                    return;
                }

                setSending(true);
                try {
                    const retry = await WhatsAppService.sendMessage(jid, retryText, chatData);
                    if (retry && !retry.error) {
                        appendPendingOutgoing(jid, retryText, retry);
                        setInput('');
                        loadMessages();
                        openConfirm('Sucesso', 'Mensagem enviada após corrigir o número.');
                        return;
                    }

                    const retryError = retry?.message || 'Falha ao reenviar após correção.';
                    openConfirm('Falha no Reenvio', retryError);
                } catch (error) {
                    openConfirm('Erro', `Erro inesperado ao reenviar: ${error.message}`);
                } finally {
                    setSending(false);
                }
            }
        );
    }, [appendPendingOutgoing, loadMessages, openConfirm, openPrompt, setInput, setSending]);

    const handleMicClick = useCallback(async () => {
        if (!outboundJid) return;

        if (recording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferredMimeType = getPreferredAudioMimeType();
            const mediaRecorder = preferredMimeType
                ? new MediaRecorder(stream, { mimeType: preferredMimeType })
                : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            audioMimeTypeRef.current = mediaRecorder.mimeType || preferredMimeType || '';

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const finalMimeType = audioMimeTypeRef.current || 'audio/webm';
                const extension = getAudioExtension(finalMimeType);
                const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
                const audioFile = new File([audioBlob], `voice_message.${extension}`, { type: finalMimeType });

                setSending(true);
                try {
                    const response = await WhatsAppService.sendMedia(outboundJid, audioFile, '', true);
                    if (response && !response.error) {
                        await persistOutgoingEvent({ jid: outboundJid, response, kind: 'audio' });
                        loadMessages();
                    } else {
                        const reason = response?.message || 'Falha ao enviar áudio.';
                        console.error('Audio Send Failed:', response);
                        alert(`❌ ${reason}`);
                    }
                } catch (error) {
                    console.error('Audio Send Error:', error);
                    alert('❌ Erro ao enviar áudio.');
                } finally {
                    setSending(false);
                }

                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setRecording(true);
        } catch (error) {
            console.error('Mic Access Error:', error);
            alert('❌ Erro ao acessar microfone. Verifique as permissões.');
        }
    }, [loadMessages, outboundJid, persistOutgoingEvent, recording, setSending]);

    const handleSend = useCallback(async (e) => {
        if (e) e.preventDefault();
        const jid = outboundJid;
        if (!input.trim() || sending || !jid) return;
        const learningChatId = activeChat?.id || jid;

        const finalText = input.trim();
        const suggestionText = String(suggestion || '').trim();
        let source = 'manual';
        let editedSuggestion = false;
        let usedMagicWand = false;

        if (suggestionText && finalText === suggestionText) {
            source = 'ai_suggestion_accepted';
        } else if (suggestionText && finalText !== suggestionText) {
            source = 'ai_suggestion_edited';
            editedSuggestion = true;
        }

        const learningEvents = useStore.getState().learningEvents || [];
        const recentWand = [...learningEvents]
            .reverse()
            .find((event) =>
                event?.type === 'magic_wand_generated' &&
                event?.chatId === jid &&
                Date.now() - Number(event?.timestamp || 0) < 30 * 60 * 1000
            );

        if (recentWand) {
            if (String(recentWand.enhancedText || '').trim() === finalText) {
                source = 'magic_wand_accepted';
                usedMagicWand = true;
            } else if (editedSuggestion) {
                source = 'magic_wand_edited';
                usedMagicWand = true;
            }
        }

        setSending(true);
        try {
            const res = await WhatsAppService.sendMessage(jid, input, activeChat);

            if (res && !res.error) {
                appendPendingOutgoing(jid, input, res);
                await persistOutgoingEvent({ jid, text: finalText, response: res, kind: 'text' }).catch((error) => {
                    console.error('AURA persist outgoing sync error:', error);
                });

                recordLearningEvent({
                    type: 'message_sent',
                    chatId: learningChatId,
                    source,
                    finalText,
                    suggestionText: suggestionText || undefined,
                    edited: editedSuggestion,
                    usedMagicWand,
                });

                if (editedSuggestion && suggestionText) {
                    recordLearningEvent({
                        type: 'suggestion_edited_accepted',
                        chatId: learningChatId,
                        source: 'ai_suggestion_edited',
                        suggestionText,
                        finalText,
                    });
                }

                if (source === 'magic_wand_accepted') {
                    recordLearningEvent({
                        type: 'magic_wand_accepted',
                        chatId: learningChatId,
                        source,
                        enhancedText: finalText,
                        suggestionText: suggestionText || undefined,
                        finalText,
                    });
                }

                setInput('');
                await loadMessages();
                setTimeout(() => {
                    loadMessages();
                }, 1200);
            } else {
                const errorMsg = res?.message || 'Erro ao enviar mensagem';
                console.error('❌ Erro ao enviar:', errorMsg);

                if (res?.needsPhoneNumber) {
                    const suggested = res?.suggestedPhone || res?.attemptedPhone || '';
                    promptManualPhoneAndRetry(jid, suggested, input, activeChat);
                } else if (res?.invalidRecipient) {
                    openConfirm('Número indisponível', errorMsg);
                } else {
                    openConfirm('Falha no Envio', `${errorMsg}\n\n💡 Dica: Use o botão de lápis (✏️) no topo para corrigir o número.`);
                }
            }
        } catch (error) {
            console.error('AURA Send Error:', error);
            openConfirm('Erro', `Erro inesperado: ${error.message}`);
        }
        setSending(false);
    }, [activeChat, appendPendingOutgoing, input, loadMessages, openConfirm, outboundJid, persistOutgoingEvent, promptManualPhoneAndRetry, recordLearningEvent, sending, setInput, setSending, suggestion]);

    const useSuggestion = useCallback(() => {
        if (suggestion && !suggestion.includes('...')) {
            setInput(suggestion);
        }
    }, [setInput, suggestion]);

    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset the input so the same file can be selected again if needed
        e.target.value = '';

        setShowAttachMenu(false);

        openPrompt(`Enviar: ${file.name}`, '', async (caption) => {
            try {
                setSending(true);
                const res = await WhatsAppService.sendMedia(outboundJid, file, caption || '');
                if (res) {
                    const type = String(file?.type || '');
                    const kind = type.startsWith('image/')
                        ? 'image'
                        : type.startsWith('video/')
                            ? 'video'
                            : 'document';
                    await persistOutgoingEvent({ jid: outboundJid, text: caption || '', response: res, kind });
                    loadMessages();
                } else {
                    console.error('Upload failed result:', res);
                    openConfirm('Erro', 'Falha ao enviar arquivo.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                openConfirm('Erro', 'Erro ao enviar mídia.');
            } finally {
                setSending(false);
            }
        });
    }, [loadMessages, openConfirm, openPrompt, outboundJid, persistOutgoingEvent, setSending, setShowAttachMenu]);

    // This now only handles the menu logic if needed, or can be removed if handled in UI
    const handleAttachmentMenuOpen = useCallback(() => {
        setShowAttachMenu(true);
    }, [setShowAttachMenu]);

    return {
        recording,
        handleMicClick,
        handleSend,
        useSuggestion,
        handleFileSelect,
        handleAttachmentMenuOpen,
    };
}
