export const formatJid = (jid) => {
    if (!jid) return '';
    const raw = String(jid);

    // Handle @lid (Linked ID)
    if (raw.includes('@lid')) {
        const idPart = raw.split('@')[0];
        // Only attempt phone formatting if it's likely a real number mapped to a JID
        // Otherwise, return as a clean ID string to avoid "+42" misidentification
        return idPart;
    }

    const number = raw.split('@')[0].replace(/\D/g, '');

    // Brazilian Numbers (55...)
    if (number.startsWith('55')) {
        let ddd = number.slice(2, 4);
        let part = number.slice(4);

        // Add 9th digit if missing (common in old WA JIDs for Brazilian mobile)
        // Mobile numbers in Brazil have 11 digits (DDD + 9 + 8 digits)
        // If we only have 10 digits after '55' (DDD + 8 digits), it's likely missing the 9
        if (part.length === 8) {
            part = '9' + part;
        }

        if (part.length === 9) {
            return `(${ddd}) ${part.slice(0, 5)}-${part.slice(5)}`;
        }

        if (part.length === 8) {
            return `(${ddd}) ${part.slice(0, 4)}-${part.slice(4)}`;
        }
    }

    // Default formatting for other numbers
    if (number.length > 10) {
        return `+${number.slice(0, 2)} ${number.slice(2, 4)} ${number.slice(4, 9)}-${number.slice(9)}`;
    }

    return number;
};
