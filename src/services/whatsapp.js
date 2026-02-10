import { useStore } from '../store/useStore';
import { io } from 'socket.io-client';

class WhatsAppService {
    constructor() {
        this.socket = null;
    }

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

    connectSocket() {
        const { apiUrl, apiKey, instanceName } = useStore.getState();
        if (!apiUrl || !instanceName || this.socket) return;

        console.log(`🔌 Initializing Socket for ${instanceName}...`);

        // Evolution API usually exposes socket at root
        const baseUrl = String(apiUrl).trim().endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        this.socket = io(baseUrl, {
            transports: ['websocket', 'polling'],
            query: {
                apikey: apiKey
            }
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket Connected!');
        });

        this.socket.on(`messages.upsert`, (payload) => {
            // Payload format: { instance, data: { ...message... }, ... }
            if (payload?.data) {
                const msg = payload.data;
                const remoteJid = msg.key?.remoteJid;

                // DEEP SCAN for Phone Number in Real-Time
                // This mimics N8N's ability to see the raw webhook
                if (remoteJid && remoteJid.includes('@lid')) {
                    // Check if message has participant with real number
                    const participant = msg.key?.participant || msg.participant;
                    if (participant && participant.includes('@s.whatsapp.net')) {
                        const extracted = participant.split('@')[0];
                        console.log(`🕵️ Socket Discovery: Found valid number ${extracted} for LID ${remoteJid}`);
                        this.setManualPhoneMapping(remoteJid, extracted);
                    }
                }

                // Append to store if active chat? 
                // For now, just logging and fixing contact mapping.
                // We can expand this to update useStore messages later.
            }
        });
    }

    async checkConnection() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return 'disconnected';

        // Ensure socket is connected
        if (!this.socket) this.connectSocket();

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

    // --- IDENTITY RESOLUTION (AURA CORE v9) ---

    getManualPhoneMapping(jid) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactPhoneMap') || '{}');
            return mappings[jid] || null;
        } catch (e) {
            return null;
        }
    }

    getManualNameMapping(jid) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactNameMap') || '{}');
            return mappings[jid] || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Centralized function to resolve the "truth" about a contact.
     * Prioritizes (1) Manual Mappings, (2) Native JID info, (3) Last Message Metadata.
     */
    resolveIdentity(jid, chatData = null) {
        if (!jid) return { id: null, phone: null, name: null, isLid: false };

        const isLid = String(jid).includes('@lid');
        const manualPhone = this.getManualPhoneMapping(jid);
        const manualName = this.getManualNameMapping(jid);

        // 1. Determine Phone Number
        let phone = manualPhone;
        if (!phone) {
            if (jid.includes('@s.whatsapp.net') && !isLid) {
                phone = jid.split('@')[0];
            } else if (chatData) {
                // Try extracting from participant/metadata
                const participant = chatData.lastMessage?.key?.participant ||
                    chatData.lastMessage?.participant ||
                    chatData.participant;
                if (participant && participant.includes('@s.whatsapp.net')) {
                    phone = participant.split('@')[0];
                }
            }
        }
        // Cleanup phone (numbers only)
        if (phone) phone = phone.replace(/\D/g, '');

        // 2. Determine Display Name
        let name = manualName;
        if (!name && chatData) {
            name = chatData.name || chatData.pushName || chatData.verifiedName;
        }

        return {
            id: jid,
            phone: phone || null,
            name: name || null,
            isLid,
            displayName: name || (phone ? `(31) ${phone.slice(-9, -4)}-${phone.slice(-4)}` : jid)
        };
    }

    async fetchChats() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return [];

        console.log('🧹 AURA: Fetching and cleaning chats list...');

        // 1. Fetch raw chats and address book contacts in parallel
        const [rawChatsData, rawContacts] = await Promise.all([
            this.request(`/chat/findChats/${instanceName}`, 'POST', {}),
            this.fetchContacts()
        ]);

        const chatList = Array.isArray(rawChatsData) ? rawChatsData : (rawChatsData?.records || rawChatsData?.chats || []);
        const contactList = Array.isArray(rawContacts) ? rawContacts : [];

        // 2. Build a high-fidelity contacts map for recovery
        const contactsMap = new Map(); // Name -> JID
        contactList.forEach(c => {
            const jid = c.id || c.jid;
            const name = (c.name || c.pushName || "").trim();
            if (jid && jid.includes('@s.whatsapp.net') && name) {
                contactsMap.set(name.toLowerCase(), jid);
            }
        });

        // 3. SECURE MERGING: Group by Canonical Identity
        const mergedGroups = new Map(); // Canonical Phone or JID -> Chat Object

        chatList.forEach(chat => {
            const rawJid = chat.remoteJid || chat.jid || chat.id;
            if (!rawJid) return;

            // Normalize JID
            const jid = rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`;
            chat.id = jid;
            chat.remoteJid = jid;

            // Resolve identity using all signals
            let identity = this.resolveIdentity(jid, chat);

            // Recovery Strategy: If LID still has no phone, try search by Name in contacts map
            if (identity.isLid && !identity.phone && identity.name) {
                const recoveryJid = contactsMap.get(identity.name.toLowerCase());
                if (recoveryJid) {
                    identity.phone = recoveryJid.split('@')[0];
                    console.log(`🕵️ AURA: Recovered LID ${jid} phone (${identity.phone}) via Address Book match`);
                }
            }

            // Grouping key: Prefer phone number if known, otherwise fallback to JID
            const key = identity.phone || jid;
            const existing = mergedGroups.get(key);

            if (!existing) {
                // Initialize the merged object
                mergedGroups.set(key, { ...chat, auraIdentity: identity });
            } else {
                // IDENTITY FUSION: Merge newest content
                const getTS = (c) => c.lastMessage?.messageTimestamp || c.messageTimestamp || c.conversationTimestamp || 0;
                if (getTS(chat) > getTS(existing)) {
                    // Chat is newer, update main message info but keep the best JID
                    const bestJid = existing.id.includes('@s.whatsapp.net') && !existing.isLid ? existing.id : chat.id;
                    mergedGroups.set(key, { ...chat, id: bestJid, remoteJid: bestJid, auraIdentity: identity });
                }
                // Accumulate unread
                existing.unreadCount = (existing.unreadCount || 0) + (chat.unreadCount || 0);
            }
        });

        // 4. FINAL SORT and CLEANUP
        return Array.from(mergedGroups.values())
            .map(c => ({
                ...c,
                name: c.auraIdentity.displayName || c.name // Ensure UI uses the best name
            }))
            .sort((a, b) => {
                const getT = (c) => (c.lastMessage?.messageTimestamp || c.messageTimestamp || c.conversationTimestamp || 0);
                return getT(b) - getT(a);
            });
    }

    async fetchContacts() {
        const { instanceName } = useStore.getState();
        if (!instanceName) return [];
        try {
            // v2 standard: POST to findContacts to get address book
            const data = await this.request(`/chat/findContacts/${instanceName}`, 'POST', {});
            const list = Array.isArray(data) ? data : (data?.records || data?.contacts || []);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            console.error("Error fetching contacts:", e);
            return [];
        }
    }

    async fetchMessages(jid, count = 50) {
        const { instanceName } = useStore.getState();
        if (!instanceName || !jid) return [];

        try {
            // Priority: Fetch from the actual JID
            const response = await this.request(`/chat/findMessages/${instanceName}`, 'POST', {
                remoteJid: jid,
                count: count
            });
            const msgs = Array.isArray(response) ? response : (response?.records || response?.messages || []);

            // CLEANUPS: Evolution API v2 sometimes returns messages with wrong keys
            return msgs.map(m => ({
                ...m,
                key: m.key || { remoteJid: jid, fromMe: false, id: m.id }
            }));
        } catch (e) {
            console.error("fetchMessages Error:", e);
            return [];
        }
    }

    async ensurePhoneNumber(jid, chatData = null) {
        // Use centralized resolver
        const identity = this.resolveIdentity(jid, chatData);
        if (identity.phone) return identity.phone;

        // Fallback: LID with no discovery yet? Return raw JID for Evolution API to handle
        if (identity.isLid) {
            console.warn(`⚠️ Sending blind to LID ${jid} - No phone mapping found.`);
            return jid;
        }

        return jid; // Just return it and hope for the best
    }

    async sendMessage(jid, text, chatData = null) {
        const { instanceName } = useStore.getState();
        if (!instanceName || !jid || !text) return null;

        // Fetch number (Discovery)
        const recipient = await this.ensurePhoneNumber(jid, chatData);

        const payload = {
            number: recipient,
            text: text,
            linkPreview: true
        };

        const response = await this.request(`/message/sendText/${instanceName}`, 'POST', payload);

        if (response?.error) {
            // Fallback for newer Evolution API versions that might expect 'remoteJid' instead of 'number'
            if (response.status === 400 || response.status === 404) {
                return await this.request(`/message/sendText/${instanceName}`, 'POST', {
                    remoteJid: recipient,
                    text: text
                });
            }
        }

        return response;
    }

    // --- LEGACY CLEANUP ---
    setManualPhoneMapping(jid, phoneNumber) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactPhoneMap') || '{}');
            mappings[jid] = phoneNumber;
            localStorage.setItem('contactPhoneMap', JSON.stringify(mappings));
            console.log(`✅ Saved phone mapping: ${jid} → ${phoneNumber}`);
            return true;
        } catch (e) {
            return false;
        }
    }

    setManualNameMapping(jid, name) {
        try {
            const mappings = JSON.parse(localStorage.getItem('contactNameMap') || '{}');
            mappings[jid] = name;
            localStorage.setItem('contactNameMap', JSON.stringify(mappings));
            console.log(`✅ Saved name mapping: ${jid} → ${name}`);
            return true;
        } catch (e) {
            return false;
        }
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
