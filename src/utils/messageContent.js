export function unwrapMessageContent(rawMessage) {
    let msg = rawMessage || {};

    // Unwrap common WhatsApp wrapper layers (Evolution/Baileys payloads)
    for (let i = 0; i < 6; i += 1) {
        if (!msg || typeof msg !== 'object') break;

        const nested =
            msg.ephemeralMessage?.message ||
            msg.viewOnceMessage?.message ||
            msg.viewOnceMessageV2?.message ||
            msg.viewOnceMessageV2Extension?.message ||
            msg.documentWithCaptionMessage?.message ||
            msg.editedMessage?.message;

        if (!nested) break;
        msg = nested;
    }

    return msg || {};
}
