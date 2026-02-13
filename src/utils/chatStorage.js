const ARCHIVED_CHATS_KEY = 'archived_chats';
export const ARCHIVED_CHATS_CHANGED_EVENT = 'archived-chats:changed';

function getScopedArchivedChatsKey() {
    const tenantId = String(localStorage.getItem('aura_tenant_id') || '').trim();
    return tenantId ? `${ARCHIVED_CHATS_KEY}:${tenantId}` : ARCHIVED_CHATS_KEY;
}

function readArchivedChats() {
    const scopedKey = getScopedArchivedChatsKey();
    try {
        const scopedRaw = localStorage.getItem(scopedKey);
        if (scopedRaw) {
            const parsed = JSON.parse(scopedRaw);
            return Array.isArray(parsed) ? parsed : [];
        }

        if (scopedKey !== ARCHIVED_CHATS_KEY) {
            const legacyRaw = localStorage.getItem(ARCHIVED_CHATS_KEY);
            if (legacyRaw) {
                const legacyParsed = JSON.parse(legacyRaw);
                if (Array.isArray(legacyParsed)) {
                    localStorage.setItem(scopedKey, JSON.stringify(legacyParsed));
                    return legacyParsed;
                }
            }
        }

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
    localStorage.setItem(getScopedArchivedChatsKey(), JSON.stringify(archived));
    notifyArchivedChatsChanged();
    return true;
}

export function unarchiveChat(chatId) {
    const archived = getArchivedChats();
    const updated = archived.filter((id) => id !== chatId);
    if (updated.length === archived.length) return false;
    localStorage.setItem(getScopedArchivedChatsKey(), JSON.stringify(updated));
    notifyArchivedChatsChanged();
    return true;
}
