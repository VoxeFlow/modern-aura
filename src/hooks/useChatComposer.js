import { useCallback, useRef, useState } from 'react';
import WhatsAppService from '../services/whatsapp';
import { useStore } from '../store/useStore';

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
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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
        if (!activeChat?.id) return;

        if (recording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setRecording(false);
            return;
        }

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
                const audioFile = new File([audioBlob], 'voice_message.mp3', { type: 'audio/mp4' });

                setSending(true);
                try {
                    await WhatsAppService.sendMedia(activeChat.id, audioFile, '', true);
                    loadMessages();
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
    }, [activeChat?.id, loadMessages, recording, setSending]);

    const handleSend = useCallback(async (e) => {
        if (e) e.preventDefault();
        const jid = activeChat?.id;
        if (!input.trim() || sending || !jid) return;

        setSending(true);
        try {
            const res = await WhatsAppService.sendMessage(jid, input, activeChat);

            if (res && !res.error) {
                appendPendingOutgoing(jid, input, res);
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
    }, [activeChat, appendPendingOutgoing, input, loadMessages, openConfirm, promptManualPhoneAndRetry, sending, setInput, setSending]);

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
                const res = await WhatsAppService.sendMedia(activeChat.id, file, caption || '');
                if (res) {
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
    }, [activeChat?.id, loadMessages, openConfirm, openPrompt, setSending, setShowAttachMenu]);

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
