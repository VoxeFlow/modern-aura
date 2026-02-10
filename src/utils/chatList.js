import { formatJid } from './formatter';

export function getChatJid(chat) {
    return chat?.remoteJid || chat?.jid || chat?.id;
}

export function getChatTimestampMs(chat) {
    const ts = chat?.lastMessage?.messageTimestamp || chat?.messageTimestamp || chat?.conversationTimestamp || 0;
    return ts * 1000;
}

export function getChatDisplayName(chat) {
    return [
        chat?.name,
        chat?.pushName,
        chat?.verifiedName,
        chat?.lastMessage?.pushName,
        chat?.lastMessage?.key?.participant,
    ].find((name) => name && name !== 'Você' && !name.includes('@lid'));
}

export function getChatAvatar(chat) {
    return chat?.profilePicUrl || chat?.profilePictureUrl || chat?.profile || chat?.avatar || null;
}

export function getChatPreview(chat, { includeAudioTranscription = false } = {}) {
    const msg = chat?.lastMessage?.message || chat?.message || {};

    const content =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        chat?.lastMessage?.content ||
        '';

    if (content) return content.length > 35 ? `${content.substring(0, 35)}...` : content;

    if (msg.audioMessage) {
        if (includeAudioTranscription) {
            const transcription = msg.audioMessage?.contextInfo?.transcription || msg.audioMessage?.transcription;
            return transcription ? `🎵 ${transcription}` : '🎵 Áudio';
        }
        return '🎵 Áudio';
    }
    if (msg.imageMessage) return '📸 Imagem';
    if (msg.videoMessage) return '🎥 Vídeo';
    if (msg.documentMessage) return '📄 Documento';
    if (msg.stickerMessage) return '✨ Figurinha';

    return formatJid(getChatJid(chat));
}
