const ARCHIVED_CHATS_KEY = 'archived_chats';
export const ARCHIVED_CHATS_CHANGED_EVENT = 'archived-chats:changed';

function readArchivedChats() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ARCHIVED_CHATS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('AURA chatStorage parse error:', error);
        return [];
    }
}

function notifyArchivedChatsChanged() {
    window.dispatchEvent(new CustomEvent(ARCHIVED_CHATS_CHANGED_EVENT));
}

export function getArchivedChats() {
    return readArchivedChats();
}

export function isChatArchived(chatId) {
    return getArchivedChats().includes(chatId);
}

export function archiveChat(chatId) {
    const archived = getArchivedChats();
    if (archived.includes(chatId)) return false;
    archived.push(chatId);
    localStorage.setItem(ARCHIVED_CHATS_KEY, JSON.stringify(archived));
    notifyArchivedChatsChanged();
    return true;
}

export function unarchiveChat(chatId) {
    const archived = getArchivedChats();
    const updated = archived.filter((id) => id !== chatId);
    if (updated.length === archived.length) return false;
    localStorage.setItem(ARCHIVED_CHATS_KEY, JSON.stringify(updated));
    notifyArchivedChatsChanged();
    return true;
}
