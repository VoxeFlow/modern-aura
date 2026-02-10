export function getClientNameForAi(activeChat) {
    const rawName = activeChat?.name || "";
    const isNumeric = /^\d+$/.test(rawName.replace(/\D/g, ""));
    return (isNumeric || rawName.includes("@") || !rawName) ? "Cliente" : rawName;
}

export function getMessageText(record) {
    const msg = record?.message || {};
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        record?.content ||
        record?.text ||
        ""
    );
}

export function buildStructuredHistory(messages = []) {
    return messages
        .slice(-15)
        .map((record) => {
            const isMe = record?.key?.fromMe || record?.fromMe;
            return {
                role: isMe ? "assistant" : "user",
                content: getMessageText(record),
            };
        })
        .filter((item) => item.content.trim() !== "");
}

export function getLastClientText(messages = []) {
    const lastClientMsg = [...messages].reverse().find((record) => !(record?.key?.fromMe || record?.fromMe));
    return getMessageText(lastClientMsg);
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
    const msg = record?.message || {};
    const content = getMessageText(record);

    if (content) {
        return { displayContent: content, mediaType: null, transcription: null, imageCaption: null };
    }

    if (msg.audioMessage) {
        const transcription =
            msg.audioMessage?.contextInfo?.transcription ||
            msg.audioMessage?.transcription ||
            record?.transcription ||
            null;
        return { displayContent: "", mediaType: "audio", transcription, imageCaption: null };
    }

    if (msg.imageMessage) {
        return {
            displayContent: "",
            mediaType: "image",
            transcription: null,
            imageCaption: msg.imageMessage.caption || null,
        };
    }

    if (msg.videoMessage) return { displayContent: "(Vídeo 🎥)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.documentMessage) return { displayContent: "(Documento 📄)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.stickerMessage) return { displayContent: "(Figurinha ✨)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.locationMessage) return { displayContent: "(Localização 📍)", mediaType: null, transcription: null, imageCaption: null };
    if (msg.contactMessage) return { displayContent: "(Contato 👤)", mediaType: null, transcription: null, imageCaption: null };

    return { displayContent: "(Mídia)", mediaType: null, transcription: null, imageCaption: null };
}
