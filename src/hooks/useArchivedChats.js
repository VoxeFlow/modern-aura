import { useCallback, useEffect, useState } from 'react';
import { ARCHIVED_CHATS_CHANGED_EVENT, getArchivedChats } from '../utils/chatStorage';

export function useArchivedChats() {
    const [archivedChatIds, setArchivedChatIds] = useState(() => getArchivedChats());

    const refreshArchivedChats = useCallback(() => {
        setArchivedChatIds(getArchivedChats());
    }, []);

    useEffect(() => {
        window.addEventListener('storage', refreshArchivedChats);
        window.addEventListener(ARCHIVED_CHATS_CHANGED_EVENT, refreshArchivedChats);

        return () => {
            window.removeEventListener('storage', refreshArchivedChats);
            window.removeEventListener(ARCHIVED_CHATS_CHANGED_EVENT, refreshArchivedChats);
        };
    }, [refreshArchivedChats]);

    return archivedChatIds;
}
