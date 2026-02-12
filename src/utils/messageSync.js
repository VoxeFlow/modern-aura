import { unwrapMessageContent } from './messageContent';

export function getJidDigits(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

export function getMessageIdentity(record) {
    const keyId = record?.key?.id;
    if (keyId) return `key:${keyId}`;

    const ts = String(record?.messageTimestamp || '');
    const fromMe = record?.key?.fromMe || record?.fromMe ? '1' : '0';
    const remote = getJidDigits(record?.key?.remoteJid || record?.remoteJid || '');
    const participant = getJidDigits(record?.key?.participant || record?.participant || '');
    const msg = unwrapMessageContent(record?.message || {});
    const text =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.audioMessage?.caption ||
        msg.documentMessage?.fileName ||
        '';

    return `fp:${fromMe}:${ts}:${remote}:${participant}:${text}`;
}

export function sortMessagesDesc(messages = []) {
    return [...messages].sort((a, b) => (b?.messageTimestamp || 0) - (a?.messageTimestamp || 0));
}

export function dedupeMessages(messages = []) {
    const seen = new Set();
    const result = [];

    for (const item of messages) {
        const id = getMessageIdentity(item);
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(item);
    }

    return result;
}

export function reconcileMessages(serverMessages = [], pendingMessages = [], pendingTtlMs = 30 * 60 * 1000) {
    const merged = sortMessagesDesc(dedupeMessages([...(serverMessages || []), ...(pendingMessages || [])]));
    const serverIds = new Set((serverMessages || []).map(getMessageIdentity));
    const threshold = Date.now() - pendingTtlMs;

    const stillPending = (pendingMessages || []).filter((item) => {
        const existsInServer = serverIds.has(getMessageIdentity(item));
        const isRecent = (item?.__createdAt || 0) > threshold;
        return !existsInServer && isRecent;
    });

    return { merged, stillPending };
}
