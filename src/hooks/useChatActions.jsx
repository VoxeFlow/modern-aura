import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { archiveChat, unarchiveChat } from '../utils/chatStorage';
import TagSelectorDialogContent from '../components/TagSelectorDialogContent';

export function useChatActions({ activeChat, openConfirm, setActiveChat }) {
    const handleTag = useCallback(() => {
        const { setTag, tags, hasFeature } = useStore.getState();
        if (!hasFeature('crm_basic')) {
            openConfirm('Recurso do plano', 'A gestão de tags e CRM está disponível nos planos Pro e Scale.');
            return;
        }

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
        handleUnarchive,
        handleArchive,
    };
}
