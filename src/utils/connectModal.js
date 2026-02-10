export function toWsUrl(apiUrl = "") {
    return apiUrl.replace("https://", "wss://").replace("http://", "ws://");
}

export function extractQrCodeBase64(payload) {
    const data = payload?.data || payload;
    let qrCodeData = null;

    if (data?.qrcode) {
        if (typeof data.qrcode === "string") {
            qrCodeData = data.qrcode;
        } else if (data.qrcode.base64) {
            qrCodeData = data.qrcode.base64;
        }
    } else if (data?.base64) {
        qrCodeData = data.base64;
    }

    if (!qrCodeData || typeof qrCodeData !== "string") return null;
    return qrCodeData.replace(/^data:image\/[a-z]+;base64,/, "");
}
