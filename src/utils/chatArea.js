import { unwrapMessageContent } from './messageContent';

export function getClientNameForAi(activeChat) {
    const rawName = activeChat?.name || "";
    const isNumeric = /^\d+$/.test(rawName.replace(/\D/g, ""));
    return (isNumeric || rawName.includes("@") || !rawName) ? "Cliente" : rawName;
}

export function getMessageText(record) {
    const msg = unwrapMessageContent(record?.message || {});
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.audioMessage?.contextInfo?.transcription ||
        msg.audioMessage?.transcription ||
        (msg.audioMessage ? "[Mensagem de áudio]" : "") ||
        record?.content ||
        record?.text ||
        ""
    );
}

function getMessageTimestamp(record) {
    const raw =
        record?.messageTimestamp ||
        record?.message?.messageTimestamp ||
        record?.timestamp ||
        record?.ts ||
        0;

    const numeric = Number(raw) || 0;
    // Some payloads use milliseconds; normalize to ms for stable sorting
    return numeric > 10_000_000_000 ? numeric : numeric * 1000;
}

function sortByTimestampAsc(messages = []) {
    return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}

export function buildStructuredHistory(messages = []) {
    const chronological = sortByTimestampAsc(messages);
    return chronological
        .slice(-30)
        .map((record) => {
            const isMe = record?.key?.fromMe || record?.fromMe;
            const content = getMessageText(record).trim();
            return {
                role: isMe ? "assistant" : "user",
                content,
            };
        })
        .filter((item) => item.content.trim() !== "");
}

export function getLastClientText(messages = []) {
    const chronological = sortByTimestampAsc(messages);
    const lastClientMsg = [...chronological].reverse().find((record) => !(record?.key?.fromMe || record?.fromMe));
    return getMessageText(lastClientMsg);
}

export function getLastAssistantText(messages = []) {
    const chronological = sortByTimestampAsc(messages);
    const lastAssistantMsg = [...chronological].reverse().find((record) => record?.key?.fromMe || record?.fromMe);
    return getMessageText(lastAssistantMsg);
}

export function deriveAnalysisData(aiText = "") {
    const lowerAi = aiText.toLowerCase();
    let level = "Consciente da Solução";
    let intent = "Interação Dinâmica";
    let strategy = "Persuasão Adaptativa";

    if (lowerAi.includes("agenda") || lowerAi.includes("horário")) intent = "Agendamento";
    if (lowerAi.includes("preço") || lowerAi.includes("valor")) intent = "Financeiro";

    return { level, intent, strategy };
}

export function resolveRenderedMessage(record) {
    const msg = unwrapMessageContent(record?.message || {});

    if (msg.audioMessage) {
        const transcription =
            msg.audioMessage?.contextInfo?.transcription ||
            msg.audioMessage?.transcription ||
            record?.transcription ||
            null;
        return {
            displayContent: "",
            mediaType: "audio",
            transcription,
            imageCaption: null,
            mimeType: msg.audioMessage?.mimetype || null,
            fileName: null,
        };
    }

    if (msg.imageMessage) {
        return {
            displayContent: "",
            mediaType: "image",
            transcription: null,
            imageCaption: msg.imageMessage?.caption || null,
            mimeType: msg.imageMessage?.mimetype || null,
            fileName: null,
        };
    }

    if (msg.documentMessage) {
        return {
            displayContent: "",
            mediaType: "document",
            transcription: null,
            imageCaption: null,
            mimeType: msg.documentMessage?.mimetype || null,
            fileName: msg.documentMessage?.fileName || "anexo",
        };
    }

    const content = getMessageText(record);
    if (content) {
        return { displayContent: content, mediaType: null, transcription: null, imageCaption: null };
    }

    if (msg.videoMessage) return { displayContent: "(Vídeo 🎥)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.stickerMessage) return { displayContent: "(Figurinha ✨)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.locationMessage) return { displayContent: "(Localização 📍)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.contactMessage) return { displayContent: "(Contato 👤)", mediaType: null, transcription: null, imageCaption: null };

    return { displayContent: "(Mídia)", mediaType: null, transcription: null, imageCaption: null };
}
