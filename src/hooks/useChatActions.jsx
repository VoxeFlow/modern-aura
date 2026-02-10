import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { archiveChat, unarchiveChat } from '../utils/chatStorage';
import TagSelectorDialogContent from '../components/TagSelectorDialogContent';

export function useChatActions({ activeChat, openConfirm, setActiveChat }) {
    const handleTag = useCallback(() => {
        const { setTag, tags } = useStore.getState();

        openConfirm(
            'Etiquetar Conversa',
            <TagSelectorDialogContent tags={tags} />,
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
    }, [activeChat, openConfirm]);

    const handleManualFix = useCallback(() => {
        const current = WhatsAppService.extractPhoneNumber(activeChat.id, activeChat);
        const newPhone = window.prompt(
            '✏️ CORREÇÃO MANUAL\n\nEste contato está sem número (apenas ID). Para conseguir responder, digite o número correto do WhatsApp (com DDD, apenas números):\n\nEx: 5531999998888',
            current || ''
        );

        if (newPhone && /^\d{10,15}$/.test(newPhone)) {
            WhatsAppService.setManualPhoneMapping(activeChat.id, newPhone, activeChat);
            alert(`✅ Número ${newPhone} salvo para este contato!\nTente enviar a mensagem novamente.`);
        } else if (newPhone) {
            alert('❌ Número inválido. Digite entre 10 e 15 números (ex: 55319...)');
        }
    }, [activeChat]);

    const handleUnarchive = useCallback(() => {
        const changed = unarchiveChat(activeChat.id);
        if (changed) {
            alert('✅ Conversa desarquivada!');
        }
    }, [activeChat]);

    const handleArchive = useCallback(() => {
        const changed = archiveChat(activeChat.id);
        if (changed) {
            setActiveChat(null);
            alert('✅ Conversa arquivada!');
        }
    }, [activeChat, setActiveChat]);

    return {
        handleTag,
        handleManualFix,
        handleUnarchive,
        handleArchive,
    };
}
