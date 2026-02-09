import { useStore } from '../store/useStore';

class WhatsAppService {
    async request(endpoint, method = 'GET', body = null) {
        const { apiUrl, apiKey } = useStore.getState();
        if (!apiUrl || !apiKey) return null;

        const headers = { 'Content-Type': 'application/json', 'apikey': apiKey };
        const baseUrl = String(apiUrl).trim().endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        const url = `${baseUrl}${cleanEndpoint}`;

        console.log(`AURA: Fetching ${url}`);
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                // Return error object instead of null so we can handle 404s
                const errorBody = await response.json().catch(() => ({}));
                return { error: true, status: response.status, ...errorBody };
            }

            return await response.json();
        } catch (e) {
            console.error("API Request Error:", e);
            return { error: true, message: e.message };
        }
    }

    async checkConnection() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return 'disconnected';
        try {
            const data = await this.request(`/instance/connectionState/${instanceName}`);
            if (data?.instance?.state) return data.instance.state;

            // If 404 (instance not found), returns null from request()
            // We should try to create it if it doesn't exist
            return 'disconnected';
        } catch (e) {
            return 'disconnected';
        }
    }

    async createInstance(name) {
        if (!name) return null;
        console.log(`AURA: Creating instance ${name}...`);
        // FIX: Use proven payload for Evolution API v2
        return await this.request('/instance/create', 'POST', {
            instanceName: name,
            token: name,
            qrcode: false,
            integration: 'WHATSAPP-BAILEYS'
        });
    }

    async connectInstance() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return null;

        // v2 standard: GET to connect instance
        // If 404, it means instance doesn't exist. We must CREATE it.
        try {
            const response = await this.request(`/instance/connect/${instanceName}`);

            // Check for specific 404 or error in response payload if request() swallowed it
            if (!response || (response.error && response.status === 404) || (response.response && response.response.message && response.response.message.includes('does not exist'))) {
                console.warn(`AURA: Instance ${instanceName} not found. Creating...`);
                await this.createInstance(instanceName);
                // Try connecting again after creation
                return await this.request(`/instance/connect/${instanceName}`);
            }

            return response;
        } catch (e) {
            console.error("Connect error:", e);
            return null;
        }
    }

    async logoutInstance() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return null;
        // CRITICAL: Delete the instance to clear all data (chats, messages) from the backend
        // This ensures that if the user connects a different number, no old data remains.
        return await this.request(`/instance/delete/${instanceName}`, 'DELETE');
    }

    standardizeJid(jid) {
        if (!jid) return null;
        let clean = String(jid).trim();
        if (!clean.includes('@')) clean = `${clean}@s.whatsapp.net`;

        // Final sanity check: must have at least 5 digits before @
        const parts = clean.split('@');
        if (parts[0].replace(/\D/g, '').length < 5) return null;

        return clean;
    }


    async fetchMediaUrl(messageKey) {
        const { instanceName } = useStore.getState();
        if (!instanceName || !messageKey) return null;

        try {
            const data = await this.request(`/chat/getBase64FromMediaMessage/${instanceName}`, 'POST', {
                message: {
                    key: messageKey
                },
                convertToMp4: false
            });

            // Evolution API may return base64 with or without Data URI prefix
            let base64 = data?.base64 || null;

            if (!base64) return null;

            // If the base64 doesn't start with "data:", add the proper prefix
            // Evolution API typically returns audio/ogg for WhatsApp voice messages
            if (!base64.startsWith('data:')) {
                base64 = `data:audio/ogg;base64,${base64}`;
            }

            return base64;
        } catch (e) {
            console.error("Media fetch error:", e);
            return null;
        }
    }

    async fetchChats() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return [];

        // v2 standard: POST to findChats
        const data = await this.request(`/chat/findChats/${instanceName}`, 'POST', {});

        const list = Array.isArray(data) ? data : (data?.records || data?.chats || []);

        const phoneChats = new Map();
        const lidChats = [];
        const finalMap = new Map();

        // Pass 1: Segregate and Normalize
        list.forEach(c => {
            const rawJid = c.remoteJid || c.jid || c.id || c.key?.remoteJid;
            if (!rawJid || typeof rawJid !== 'string') return;

            let jid = rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`;
            c.id = jid;
            c.remoteJid = jid;

            if (jid.includes('@lid')) {
                lidChats.push(c);
            } else {
                phoneChats.set(jid, c);
                finalMap.set(jid, c);
            }
        });

        // Pass 2: Merge LIDs into Phones (STRICTER)
        lidChats.forEach(lidChat => {
            let match = null;

            // Strategy A: Exact Name Match (Only if name exists and is not empty)
            const lidName = (lidChat.name || lidChat.pushName || "").trim();
            if (lidName && lidName.length > 1) {
                for (const [pJid, pChat] of phoneChats.entries()) {
                    const pName = (pChat.name || pChat.pushName || "").trim();
                    if (pName === lidName) {
                        match = pChat;
                        break;
                    }
                }
            }

            // Strategy B: Profile Pic Match (Fallback)
            if (!match && lidChat.profilePicUrl) {
                for (const [pJid, pChat] of phoneChats.entries()) {
                    if (pChat.profilePicUrl === lidChat.profilePicUrl) {
                        match = pChat;
                        break;
                    }
                }
            }

            if (match) {
                // Identity Fusion: Use the newest timestamp
                const getTS = (c) => c.lastMessage?.messageTimestamp || c.messageTimestamp || c.conversationTimestamp || 0;
                const lidTime = getTS(lidChat);
                const matchTime = getTS(match);

                if (lidTime > matchTime) {
                    match.lastMessage = lidChat.lastMessage || match.lastMessage;
                    match.messageTimestamp = lidTime;
                }
                match.linkedLid = lidChat.id;
                match.unreadCount = (match.unreadCount || 0) + (lidChat.unreadCount || 0);
            } else {
                // Keep LID if not merged
                finalMap.set(lidChat.id, lidChat);
            }
        });

        // 3. Sort by Real Activity (Last Message Timestamp)
        return Array.from(finalMap.values()).sort((a, b) => {
            const getT = (c) => {
                // messageTimestamp is in seconds from API, convert to ms
                const ts = c.lastMessage?.messageTimestamp || c.messageTimestamp || c.conversationTimestamp || 0;
                return ts * 1000;
            };

            const timeA = getT(a);
            const timeB = getT(b);

            return timeB - timeA;
        });
    }

    async fetchMessages(jid, linkedJid = null) {
        const { instanceName } = useStore.getState();
        const cleanJid = this.standardizeJid(jid);
        if (!instanceName || !cleanJid) return [];

        const tryFetch = async (targetJid) => {
            if (!targetJid) return [];
            try {
                const data = await this.request(`/chat/findMessages/${instanceName}`, 'POST', {
                    where: {
                        key: {
                            remoteJid: targetJid
                        }
                    },
                    limit: 500 // Maximum limit to capture full history
                });
                const list = data?.messages?.records || data?.records || data?.messages || [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                console.error(`Error fetching messages for ${targetJid}:`, e);
                return [];
            }
        };

        // 1. Fetch Main JID
        let messages = await tryFetch(cleanJid);

        // 2. Fetch Linked LID (if exists) - The "Missing Audio" Recovery
        if (linkedJid) {
            const lidMessages = await tryFetch(this.standardizeJid(linkedJid));
            if (lidMessages.length > 0) {
                // Merge and Deduplicate by Message Key ID
                const seen = new Set(messages.map(m => m.key?.id));
                lidMessages.forEach(m => {
                    if (!seen.has(m.key?.id)) {
                        messages.push(m);
                    }
                });
            }
        }

        // 3. Fallback: Brazilian 9-digit heuristic (only if NO linkedJid was known)
        if (messages.length === 0 && !linkedJid && cleanJid.startsWith('55')) {
            const number = cleanJid.split('@')[0];
            const alt = number.length === 13 ? number.slice(0, 4) + number.slice(5) :
                (number.length === 12 ? number.slice(0, 4) + '9' + number.slice(4) : null);
            if (alt) {
                const altMsgs = await tryFetch(`${alt}@s.whatsapp.net`);
                messages = [...messages, ...altMsgs];
            }
        }

        // 4. Sort by Timestamp Descending (Newest first)
        return messages.sort((a, b) => {
            const tA = a.messageTimestamp || 0;
            const tB = b.messageTimestamp || 0;
            return tB - tA;
        });
    }

    // PHONE NUMBER EXTRACTION & MANAGEMENT
    getManualPhoneMapping(jid) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactPhoneMap') || '{}');
            return mappings[jid] || null;
        } catch (e) {
            console.error('Error reading phone mappings:', e);
            return null;
        }
    }

    setManualPhoneMapping(jid, phoneNumber) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactPhoneMap') || '{}');
            mappings[jid] = phoneNumber;
            localStorage.setItem('contactPhoneMap', JSON.stringify(mappings));
            console.log(`✅ Saved phone mapping: ${jid} → ${phoneNumber}`);
            return true;
        } catch (e) {
            console.error('Error saving phone mapping:', e);
            return false;
        }
    }

    extractPhoneNumber(jid, chatData = null) {
        if (!jid) return null;

        // Priority 1: Regular phone number JID (e.g., "5531992957555@s.whatsapp.net")
        if (jid.includes('@s.whatsapp.net') && !jid.includes('@lid')) {
            const phone = jid.split('@')[0];
            // Validate it's actually a phone number (10-15 digits)
            if (/^\d{10,15}$/.test(phone)) {
                return phone;
            }
        }

        // Priority 2: Extract from chat metadata (for @lid contacts)
        if (chatData) {
            // Check participant field (often contains the real phone number)
            const participant = chatData.lastMessage?.key?.participant ||
                chatData.lastMessage?.participant ||
                chatData.participant;

            if (participant && participant.includes('@s.whatsapp.net')) {
                const phone = participant.split('@')[0];
                if (/^\d{10,15}$/.test(phone)) {
                    console.log(`✅ Extracted phone from participant: ${phone}`);
                    return phone;
                }
            }

            // Check remoteJid variations
            const remoteJid = chatData.lastMessage?.key?.remoteJid || chatData.remoteJid;
            if (remoteJid && remoteJid.includes('@s.whatsapp.net') && !remoteJid.includes('@lid')) {
                const phone = remoteJid.split('@')[0];
                if (/^\d{10,15}$/.test(phone)) {
                    console.log(`✅ Extracted phone from remoteJid: ${phone}`);
                    return phone;
                }
            }

            // Diagnostic logging for @lid contacts
            if (jid.includes('@lid')) {
                console.log('🔍 @lid contact metadata:', {
                    jid,
                    participant: chatData.lastMessage?.key?.participant,
                    remoteJid: chatData.lastMessage?.key?.remoteJid,
                    availableFields: Object.keys(chatData)
                });
            }
        }

        // Priority 3: Manual mapping from localStorage
        const manualPhone = this.getManualPhoneMapping(jid);
        if (manualPhone) {
            console.log(`✅ Using manual mapping: ${manualPhone}`);
            return manualPhone;
        }

        // Priority 4: No phone number found
        console.warn(`⚠️ Could not extract phone number for: ${jid}`);
        return null;
    }

    async sendMessage(jid, text, chatData = null) {
        const { instanceName, chats } = useStore.getState();
        if (!instanceName || !jid || !text) return null;

        // Fetch complete chat data from store if not provided
        if (!chatData && chats) {
            chatData = chats.find(c => (c.id === jid || c.remoteJid === jid || c.jid === jid));
            console.log('📦 Fetched chat data from store:', chatData ? 'Found' : 'Not found', jid);
        }

        // CRITICAL: Extract phone number with fallback logic (pass chatData for metadata extraction)
        const phoneNumber = this.extractPhoneNumber(jid, chatData);

        if (!phoneNumber) {
            return {
                error: true,
                message: `❌ Número de telefone não disponível para este contato.\n\nClique no ícone de edição (✏️) ao lado do nome para adicionar o número manualmente.`,
                needsPhoneNumber: true,
                jid: jid
            };
        }

        const result = await this.request(`/message/sendText/${instanceName}`, 'POST', {
            number: phoneNumber,
            text: text
        });

        // Check for "number doesn't exist" error
        if (result?.response?.message?.[0]?.exists === false) {
            return {
                error: true,
                message: `Número ${phoneNumber} não existe no WhatsApp ou não está acessível.`
            };
        }

        return result;
    }

    async sendMedia(jid, file, caption = '', isAudio = false) {
        const { instanceName } = useStore.getState();
        if (!instanceName || !jid || !file) return null;

        try {
            const cleanJid = this.standardizeJid(jid);
            if (!cleanJid) return null;

            // Convert file to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    // Remove the data:*/*;base64, prefix
                    const base64String = result.split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Determine media type
            let mediatype = 'document';
            if (isAudio || file.type.startsWith('audio/')) mediatype = 'audio'; // Evolution treats 'audio' -> PTT usually
            else if (file.type.startsWith('image/')) mediatype = 'image';
            else if (file.type.startsWith('video/')) mediatype = 'video';

            const payload = {
                number: cleanJid,
                mediatype,
                mimetype: file.type || 'audio/mp4',
                caption: caption || file.name,
                fileName: file.name,
                media: base64
            };

            // If it's a PTT audio, use appropriate endpoint/body if needed, but sendMedia usually handles it by type 'audio'
            // Evolution API v2: "audio" mediatype often implies PTT if mimetype is audio/ogg; codecs=opus

            return await this.request(`/message/sendMedia/${instanceName}`, 'POST', payload);
        } catch (e) {
            console.error("Send Media Error:", e);
            return null;
        }
    }
}

export default new WhatsAppService();
