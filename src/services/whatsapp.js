import { useStore } from '../store/useStore';
import { io } from 'socket.io-client';
import { dedupeMessages, getJidDigits } from '../utils/messageSync';

class WhatsAppService {
    constructor() {
        this.socket = null;
        this.serverInfoCache = null;
    }

    getContactPhoneMapStorageKey() {
        const tenantId = String(useStore.getState()?.tenantId || '').trim();
        return tenantId ? `contactPhoneMap:${tenantId}` : 'contactPhoneMap';
    }

    readContactPhoneMap() {
        const scopedKey = this.getContactPhoneMapStorageKey();
        try {
            const scopedRaw = localStorage.getItem(scopedKey);
            if (scopedRaw) {
                const parsed = JSON.parse(scopedRaw);
                if (parsed && typeof parsed === 'object') return parsed;
            }

            if (scopedKey !== 'contactPhoneMap') {
                const legacyRaw = localStorage.getItem('contactPhoneMap');
                if (legacyRaw) {
                    const legacyParsed = JSON.parse(legacyRaw);
                    if (legacyParsed && typeof legacyParsed === 'object') {
                        localStorage.setItem(scopedKey, JSON.stringify(legacyParsed));
                        return legacyParsed;
                    }
                }
            }
        } catch (e) {
            console.error('Error reading phone mappings:', e);
        }
        return {};
    }

    writeContactPhoneMap(map) {
        const scopedKey = this.getContactPhoneMapStorageKey();
        localStorage.setItem(scopedKey, JSON.stringify(map || {}));
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

            const contentType = String(response.headers.get('content-type') || '').toLowerCase();
            const isJson = contentType.includes('application/json');

            if (!response.ok) {
                const errorBody = isJson
                    ? await response.json().catch(() => ({}))
                    : { message: await response.text().catch(() => '') };
                return { error: true, status: response.status, ...errorBody };
            }

            if (isJson) return await response.json();
            const text = await response.text().catch(() => '');
            return { ok: true, text };
        } catch (e) {
            console.error("API Request Error:", e);
            return { error: true, message: e.message };
        }
    }

    parseVersion(version) {
        const [major = '0', minor = '0', patch = '0'] = String(version || '0.0.0').split('.');
        return [Number.parseInt(major, 10) || 0, Number.parseInt(minor, 10) || 0, Number.parseInt(patch, 10) || 0];
    }

    isVersionLessThan(version, minimum) {
        const current = this.parseVersion(version);
        const target = this.parseVersion(minimum);
        for (let i = 0; i < 3; i += 1) {
            if (current[i] < target[i]) return true;
            if (current[i] > target[i]) return false;
        }
        return false;
    }

    async getServerInfo(force = false) {
        if (!force && this.serverInfoCache) return this.serverInfoCache;
        try {
            const info = await this.request('/', 'GET');
            if (info && !info.error) {
                this.serverInfoCache = info;
                return info;
            }
        } catch (e) {
            console.error('AURA getServerInfo error:', e);
        }
        return null;
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
                    const remoteJidAlt = msg.key?.remoteJidAlt || msg.remoteJidAlt;
                    if (participant && participant.includes('@s.whatsapp.net')) {
                        const extracted = participant.split('@')[0];
                        console.log(`🕵️ Socket Discovery: Found valid number ${extracted} for LID ${remoteJid}`);
                        this.setManualPhoneMapping(remoteJid, extracted);
                    }
                    if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
                        const extractedAlt = remoteJidAlt.split('@')[0];
                        console.log(`🕵️ Socket Discovery: Found remoteJidAlt ${extractedAlt} for LID ${remoteJid}`);
                        this.setManualPhoneMapping(remoteJid, extractedAlt);
                    }
                }

                // Real-time sync for active thread to reduce polling gaps.
                useStore.getState().appendRealtimeMessage(msg);
            }
        });
    }

    async checkConnection(instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance) return 'disconnected';

        // Ensure socket is connected
        if (!this.socket) this.connectSocket();

        try {
            const data = await this.request(`/instance/connectionState/${targetInstance}`);

            if (data?.instance?.state) return data.instance.state;

            // If 404 (instance not found), returns null from request()
            // We should try to create it if it doesn't exist
            return 'disconnected';
        } catch {
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

    async connectInstance(instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance) return null;

        // v2 standard: GET to connect instance
        // If 404, it means instance doesn't exist. We must CREATE it.
        try {
            let response = await this.request(`/instance/connect/${targetInstance}`);
            if (response?.error && (response.status === 404 || response.status === 405)) {
                response = await this.request(`/instance/connect/${targetInstance}`, 'POST');
            }

            // Check for specific 404 or error in response payload if request() swallowed it
            if (!response || (response.error && response.status === 404) || (response.response && response.response.message && response.response.message.includes('does not exist'))) {
                console.warn(`AURA: Instance ${targetInstance} not found. Creating...`);
                await this.createInstance(targetInstance);
                // Try connecting again after creation
                let retry = await this.request(`/instance/connect/${targetInstance}`);
                if (retry?.error && (retry.status === 404 || retry.status === 405)) {
                    retry = await this.request(`/instance/connect/${targetInstance}`, 'POST');
                }
                return retry;
            }

            return response;
        } catch (e) {
            console.error("Connect error:", e);
            return null;
        }
    }

    async logoutInstance(instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance) return null;
        // CRITICAL: Delete the instance to clear all data (chats, messages) from the backend
        // This ensures that if the user connects a different number, no old data remains.
        return await this.request(`/instance/delete/${targetInstance}`, 'DELETE');
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

    getNum(jid) {
        return getJidDigits(jid);
    }

    getRelatedStoreJids(jid, chatData = null) {
        const targetNum = this.getNum(jid || chatData?.id || chatData?.remoteJid);
        if (!targetNum) return [];

        const { chats } = useStore.getState();
        if (!Array.isArray(chats)) return [];

        const related = [];
        chats.forEach((chat) => {
            const candidates = [
                chat?.id,
                chat?.jid,
                chat?.remoteJid,
                chat?.remoteJidAlt,
                chat?.sendTargetJid,
                chat?.linkedLid,
                chat?.lastMessage?.key?.remoteJid,
                chat?.lastMessage?.key?.remoteJidAlt,
            ];
            candidates.forEach((candidate) => {
                if (!candidate) return;
                if (this.getNum(candidate) === targetNum) related.push(candidate);
            });
        });

        return [...new Set(related.map((item) => this.standardizeJid(item)).filter(Boolean))];
    }

    toPhoneJid(phoneNumber) {
        const normalized = this.normalizePhoneNumber(phoneNumber);
        return normalized ? `${normalized}@s.whatsapp.net` : null;
    }

    isLidDerivedPhone(phoneNumber, lidJid) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const lidDigits = this.getNum(lidJid);
        if (!normalizedPhone || !lidDigits) return false;
        return normalizedPhone === lidDigits;
    }

    resolveMessageTargetJids(jid, linkedJid = null, chatData = null) {
        const targets = [
            jid,
            linkedJid,
            chatData?.id,
            chatData?.jid,
            chatData?.remoteJid,
            chatData?.remoteJidAlt,
            chatData?.sendTargetJid,
            chatData?.linkedLid,
            chatData?.lastMessage?.key?.remoteJid,
            chatData?.lastMessage?.key?.remoteJidAlt,
        ].map((candidate) => this.standardizeJid(candidate)).filter(Boolean);

        targets.push(...this.getRelatedStoreJids(jid, chatData));

        const manualPhone = this.getManualPhoneMappingFromCandidates(jid, chatData);
        if (manualPhone) targets.push(this.toPhoneJid(manualPhone));

        const extractedPhone = this.extractPhoneNumber(jid, chatData);
        if (extractedPhone) targets.push(this.toPhoneJid(extractedPhone));

        return [...new Set(targets)];
    }


    inferMimeTypeFromBase64(base64, mediaType = null) {
        const head = String(base64 || '').slice(0, 32);
        if (head.startsWith('/9j/')) return 'image/jpeg';
        if (head.startsWith('iVBORw0KGgo')) return 'image/png';
        if (head.startsWith('R0lGOD')) return 'image/gif';
        if (head.startsWith('UklGR')) return mediaType === 'audio' ? 'audio/wav' : 'image/webp';
        if (head.startsWith('JVBERi0')) return 'application/pdf';
        if (head.startsWith('UEsDB')) return 'application/zip';
        if (head.startsWith('T2dnUw')) return 'audio/ogg';
        if (head.startsWith('SUQz')) return 'audio/mpeg';
        if (head.startsWith('AAAAIGZ0eX')) return mediaType === 'audio' ? 'audio/mp4' : 'video/mp4';
        return mediaType === 'audio' ? 'audio/ogg' : 'application/octet-stream';
    }

    async fetchMediaUrl(messageKey, options = {}) {
        const { instanceName } = useStore.getState();
        if (!instanceName || !messageKey) return null;
        const { mimeType = null, mediaType = null } = options;

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

            // Keep original data URI when backend already returns one.
            if (base64.startsWith('data:')) {
                return base64;
            }

            const apiMimeType = data?.mimetype || data?.mimeType || data?.mediaType || null;
            const resolvedMimeType =
                mimeType ||
                apiMimeType ||
                this.inferMimeTypeFromBase64(base64, mediaType);

            return `data:${resolvedMimeType};base64,${base64}`;
        } catch (e) {
            console.error("Media fetch error:", e);
            return null;
        }
    }

    async fetchChats(instanceOverride = null, channelMeta = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance) return [];

        // v2 standard: POST to findChats
        const data = await this.request(`/chat/findChats/${targetInstance}`, 'POST', {});

        // Fetch Address Book to help resolve LIDs
        const contactsList = await this.fetchContacts(targetInstance);
        const contactsByNumber = new Map(); // number -> display name
        contactsList.forEach(c => {
            const jid = c.id || c.jid;
            const name = (c.name || c.pushName || "").trim();
            if (jid && jid.includes('@s.whatsapp.net') && name) {
                contactsByNumber.set(this.getNum(jid), name);
            }
        });

        const list = Array.isArray(data) ? data : (data?.records || data?.chats || []);
        const getTS = (chat) => chat?.lastMessage?.messageTimestamp || chat?.messageTimestamp || chat?.conversationTimestamp || 0;
        const lidReferenceChats = list.filter((chat) => {
            const rawJid = chat?.remoteJid || chat?.jid || chat?.id || chat?.key?.remoteJid || '';
            return (
                typeof rawJid === 'string' &&
                rawJid.includes('@lid') &&
                (chat?.pushName || chat?.name || chat?.verifiedName || chat?.profilePicUrl)
            );
        });
        const lidReferenceTimestamps = lidReferenceChats.map(getTS).filter(Boolean);
        const lidRawJids = [...new Set(
            list
                .map((chat) => chat?.remoteJid || chat?.jid || chat?.id || chat?.key?.remoteJid)
                .filter((jid) => typeof jid === 'string' && jid.includes('@lid'))
        )];
        const lidVerification = await this.verifyWhatsAppNumbersBulk(lidRawJids, targetInstance);
        const finalMap = new Map();

        // Canonicalize each chat identity and collapse equivalent records.
        list.forEach((chat) => {
            const rawJid = chat.remoteJid || chat.jid || chat.id || chat.key?.remoteJid;
            if (!rawJid || typeof rawJid !== 'string') return;

            const baseJid = this.standardizeJid(rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`);
            if (!baseJid) return;

            const isLid = baseJid.includes('@lid');
            const isDirectPhone = baseJid.includes('@s.whatsapp.net');
            const baseDigits = this.getNum(baseJid);
            if ((isLid || isDirectPhone) && (!baseDigits || baseDigits.length < 10)) return;

            // Suppress "shadow" outbound-only unsaved phone chats created during LID routing migration.
            const messageText = chat?.lastMessage?.message?.conversation || '';
            const isShadowOutboundPhone =
                isDirectPhone &&
                chat?.isSaved === false &&
                !chat?.pushName &&
                !chat?.name &&
                !chat?.profilePicUrl &&
                chat?.lastMessage?.key?.fromMe === true &&
                String(messageText).trim().length <= 8;

            if (isShadowOutboundPhone && lidReferenceTimestamps.length > 0) {
                const ts = getTS(chat);
                const hasNearbyLidActivity = lidReferenceTimestamps.some((lidTs) => Math.abs((lidTs || 0) - (ts || 0)) <= 300);
                if (hasNearbyLidActivity) return;
            }

            const verifiedLid = lidVerification.find((item) => {
                if (!item?.jid) return false;
                return item.jid === baseJid || this.getNum(item.jid) === this.getNum(baseJid);
            });

            let stableId = baseJid;
            let sendTargetJid = baseJid;
            let linkedLid = null;
            const chatAltCandidates = [
                chat?.remoteJidAlt,
                chat?.key?.remoteJidAlt,
                chat?.lastMessage?.key?.remoteJidAlt,
                chat?.lastMessage?.remoteJidAlt,
                chat?.lastMessage?.key?.remoteJid,
            ]
                .map((candidate) => this.standardizeJid(candidate))
                .filter((candidate) => candidate?.includes('@s.whatsapp.net'));

            if (isLid) {
                linkedLid = baseJid;
                const resolvedPhoneRaw = verifiedLid?.number || this.extractPhoneNumber(baseJid, chat);
                const resolvedPhone = this.isLidDerivedPhone(resolvedPhoneRaw, baseJid) ? null : resolvedPhoneRaw;
                if (resolvedPhone) chat.phoneNumber = resolvedPhone;

                const safeAltCandidates = chatAltCandidates.filter((candidate) => {
                    const candidateDigits = this.getNum(candidate);
                    return candidateDigits && candidateDigits !== this.getNum(baseJid);
                });

                // Keep LID as stable chat identity, but prefer phone jid for sending when available.
                sendTargetJid = safeAltCandidates[0] || sendTargetJid;
                if (!sendTargetJid?.includes('@s.whatsapp.net') && verifiedLid?.jid?.includes('@s.whatsapp.net')) {
                    sendTargetJid = verifiedLid.jid;
                }
                if (!sendTargetJid?.includes('@s.whatsapp.net') && resolvedPhone) {
                    sendTargetJid = `${resolvedPhone}@s.whatsapp.net`;
                }
            }

            // Merge @lid and @s.whatsapp.net variants into one logical chat by phone number.
            const logicalPhone =
                this.getNum(sendTargetJid) ||
                this.normalizePhoneNumber(chat?.phoneNumber) ||
                null;
            if (logicalPhone && logicalPhone.length >= 10) {
                stableId = `phone:${logicalPhone}`;
            } else if (isDirectPhone && baseDigits) {
                stableId = `phone:${baseDigits}`;
            } else {
                stableId = `jid:${baseJid}`;
            }

            const enriched = {
                ...chat,
                id: stableId,
                jid: stableId,
                remoteJid: stableId,
                remoteJidAlt: chatAltCandidates[0] || null,
                sendTargetJid,
                linkedLid: linkedLid || chat.linkedLid || null,
            };

            const numberName = contactsByNumber.get(this.getNum(sendTargetJid));
            if (numberName && !(enriched.name || enriched.pushName || enriched.verifiedName)) {
                enriched.name = numberName;
                enriched.pushName = numberName;
            }
            if (verifiedLid?.name && !(enriched.name || enriched.pushName || enriched.verifiedName)) {
                enriched.name = verifiedLid.name;
                enriched.pushName = verifiedLid.name;
            }

            const existing = finalMap.get(stableId);
            if (!existing) {
                finalMap.set(stableId, enriched);
                return;
            }

            // Merge duplicate logical chats by canonical identity.
            const existingTs = getTS(existing);
            const incomingTs = getTS(enriched);
            const newest = incomingTs >= existingTs ? enriched : existing;
            const oldest = newest === existing ? enriched : existing;

            finalMap.set(stableId, {
                ...oldest,
                ...newest,
                id: stableId,
                jid: newest.jid || oldest.jid || baseJid,
                remoteJid: newest.remoteJid || oldest.remoteJid || baseJid,
                sendTargetJid: newest.sendTargetJid || oldest.sendTargetJid || baseJid,
                linkedLid: newest.linkedLid || oldest.linkedLid || null,
                unreadCount: (existing.unreadCount || 0) + (enriched.unreadCount || 0),
            });
        });

        // Sort by real activity (newest first)
        const sorted = Array.from(finalMap.values()).sort((a, b) => {
            return (getTS(b) * 1000) - (getTS(a) * 1000);
        });

        // FINAL DEDUPLICATION: Ensure one chat per Phone Number
        // Sometimes the mapping logic above might miss edge cases if LIDs and Phones don't have a direct link yet.
        console.log(`AURA: Running deduplication on ${sorted.length} chats...`);
        const uniquePhones = new Set();
        const deduped = sorted.filter(chat => {
            const rawId = chat.id || chat.jid || chat.remoteJid;
            const digits = this.getNum(rawId);

            // If it's a valid phone number (10+ digits), dedupe it
            if (digits && digits.length >= 10) {
                if (uniquePhones.has(digits)) return false;
                uniquePhones.add(digits);
                return true;
            }
            // If it's a short code or group, keep it
            return true;
        });

        return deduped.map((chat) => ({
            ...chat,
            sourceInstanceName: targetInstance,
            channelId: channelMeta?.channelId || chat.channelId || null,
            channelLabel: channelMeta?.channelLabel || chat.channelLabel || targetInstance,
            chatKey: `${channelMeta?.channelId || targetInstance}::${chat.id || chat.jid || chat.remoteJid}`,
        }));
    }

    async fetchContacts(instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance) return [];
        try {
            // v2 standard: POST to findContacts to get address book
            const data = await this.request(`/chat/findContacts/${targetInstance}`, 'POST', {});
            const list = Array.isArray(data) ? data : (data?.records || data?.contacts || []);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            console.error("Error fetching contacts:", e);
            return [];
        }
    }

    async verifyWhatsAppNumbersBulk(numbersOrJids = [], instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        if (!targetInstance || !Array.isArray(numbersOrJids) || numbersOrJids.length === 0) return [];

        try {
            const response = await this.request(`/chat/whatsappNumbers/${targetInstance}`, 'POST', {
                numbers: numbersOrJids,
            });

            const rawList =
                (Array.isArray(response) && response) ||
                (Array.isArray(response?.numbers) && response.numbers) ||
                (Array.isArray(response?.data) && response.data) ||
                (Array.isArray(response?.response) && response.response) ||
                (Array.isArray(response?.response?.message) && response.response.message) ||
                [];

            return rawList.map((item) => {
                const jid = item?.jid || item?.number || null;
                return {
                    exists: item?.exists !== false,
                    jid,
                    number: this.normalizePhoneNumber(item?.number || this.getNum(jid)),
                    name: item?.name || null,
                    lid: item?.lid || null,
                    raw: item,
                };
            });
        } catch (error) {
            console.error('AURA verifyWhatsAppNumbersBulk error:', error);
            return [];
        }
    }

    async verifyWhatsAppNumber(numberOrJid) {
        const list = await this.verifyWhatsAppNumbersBulk([numberOrJid]);
        return list[0] || null;
    }

    async fetchMessages(jid, linkedJid = null, chatData = null, instanceOverride = null) {
        const { instanceName } = useStore.getState();
        const targetInstance = instanceOverride || instanceName;
        const cleanJid = this.standardizeJid(jid);
        if (!targetInstance || !cleanJid) return [];

        const tryFetch = async (targetJid, altJid = null) => {
            if (!targetJid) return [];
            try {
                const keyWhere = { remoteJid: targetJid };
                if (altJid) keyWhere.remoteJidAlt = altJid;

                const data = await this.request(`/chat/findMessages/${targetInstance}`, 'POST', {
                    where: {
                        key: keyWhere,
                    },
                    offset: 500,
                    page: 1,
                });
                const list = data?.messages?.records || data?.records || data?.messages || [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                console.error(`Error fetching messages for ${targetJid}:`, e);
                return [];
            }
        };

        // 1. Fetch all candidate JIDs for this logical conversation
        const targets = this.resolveMessageTargetJids(cleanJid, linkedJid, chatData);
        let messages = [];
        for (const target of targets) {
            const partial = await tryFetch(target, chatData?.linkedLid || null);
            if (partial.length > 0) messages.push(...partial);
        }

        // 2. Fallback: Brazilian 9-digit heuristic (only if empty and no linkedJid known)
        if (messages.length === 0 && !linkedJid && cleanJid.startsWith('55')) {
            const number = cleanJid.split('@')[0];
            const alt = number.length === 13 ? number.slice(0, 4) + number.slice(5) :
                (number.length === 12 ? number.slice(0, 4) + '9' + number.slice(4) : null);
            if (alt) {
                const altMsgs = await tryFetch(`${alt}@s.whatsapp.net`);
                messages = [...messages, ...altMsgs];
            }
        }

        // 3. Final dedupe + sort
        const deduped = dedupeMessages(messages);
        return deduped.sort((a, b) => {
            const tA = a.messageTimestamp || 0;
            const tB = b.messageTimestamp || 0;
            return tB - tA;
        });
    }

    // PHONE NUMBER EXTRACTION & MANAGEMENT
    getManualPhoneMapping(jid) {
        try {
            const mappings = this.readContactPhoneMap();
            return mappings[jid] || null;
        } catch (e) {
            console.error('Error reading phone mappings:', e);
            return null;
        }
    }

    normalizePhoneNumber(input) {
        if (!input) return null;
        const digits = String(input).replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(digits)) return null;
        return digits;
    }

    getCandidateJids(jid, chatData = null) {
        const candidates = [
            jid,
            chatData?.id,
            chatData?.jid,
            chatData?.remoteJid,
            chatData?.remoteJidAlt,
            chatData?.sendTargetJid,
            chatData?.linkedLid,
            chatData?.lastMessage?.key?.remoteJid,
            chatData?.lastMessage?.key?.remoteJidAlt,
            chatData?.lastMessage?.remoteJid,
            chatData?.lastMessage?.remoteJidAlt,
        ].filter(Boolean);

        return [...new Set(candidates)];
    }

    getManualPhoneMappingFromCandidates(jid, chatData = null) {
        const candidates = this.getCandidateJids(jid, chatData);
        for (const candidate of candidates) {
            const mapped = this.getManualPhoneMapping(candidate);
            if (mapped) return mapped;
        }
        return null;
    }

    setManualPhoneMapping(jid, phoneNumber, chatData = null) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            if (!normalized) {
                console.warn(`⚠️ Invalid phone mapping for ${jid}:`, phoneNumber);
                return false;
            }
            const mappings = this.readContactPhoneMap();
            const candidates = this.getCandidateJids(jid, chatData);
            candidates.forEach((candidate) => {
                mappings[candidate] = normalized;
            });
            this.writeContactPhoneMap(mappings);
            console.log(`✅ Saved phone mapping: [${candidates.join(', ')}] → ${normalized}`);
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

        // Priority 2: Phone number attached during chat merge/resolution
        const attachedPhone = this.normalizePhoneNumber(chatData?.phoneNumber);
        if (attachedPhone) {
            console.log(`✅ Using attached chat phoneNumber: ${attachedPhone}`);
            return attachedPhone;
        }

        // Priority 3: Extract from chat metadata (for @lid contacts)
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

            const remoteJidAlt = chatData.lastMessage?.key?.remoteJidAlt ||
                chatData.lastMessage?.remoteJidAlt ||
                chatData.remoteJidAlt;
            if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
                const phone = remoteJidAlt.split('@')[0];
                if (/^\d{10,15}$/.test(phone)) {
                    console.log(`✅ Extracted phone from remoteJidAlt: ${phone}`);
                    return phone;
                }
            }
        }

        // Priority 4: Manual mapping from localStorage
        const manualPhone = this.getManualPhoneMappingFromCandidates(jid, chatData);
        if (manualPhone) {
            console.log(`✅ Using manual mapping: ${manualPhone}`);
            return manualPhone;
        }

        // Priority 5: No phone number found
        return null;
    }

    async ensurePhoneNumber(jid, chatData = null) {
        // 1. Try synchronous extraction first (Fastest)
        let phoneNumber = this.extractPhoneNumber(jid, chatData);
        if (phoneNumber) return phoneNumber;

        // 2. If valid chatData exists, try scanning its history via API
        if (chatData || jid) {
            console.log(`🕵️ Smart Scan: Searching phone number for ${jid}...`);

            // Fetch last 50 messages to find a participant
            const messages = await this.fetchMessages(jid, null, chatData);
            if (messages && messages.length > 0) {
                for (const msg of messages) {
                    const participant = msg.key?.participant || msg.participant;
                    const remoteJid = msg.key?.remoteJid || msg.remoteJid;
                    const remoteJidAlt = msg.key?.remoteJidAlt || msg.remoteJidAlt;

                    // Check if it's a valid phone JID
                    const potential = [participant, remoteJidAlt, remoteJid].find(
                        (p) => p && p.includes('@s.whatsapp.net') && !p.includes('@lid')
                    );

                    if (potential) {
                        const extracted = potential.split('@')[0];
                        if (/^\d{10,15}$/.test(extracted)) {
                            console.log(`✅ Smart Scan FOUND: ${extracted} in message from ${new Date(msg.messageTimestamp * 1000).toLocaleString()}`);

                            // Auto-save the mapping!
                            this.setManualPhoneMapping(jid, extracted, chatData);
                            return extracted;
                        }
                    }
                }
            }

            // 3. DEEP HUNT: Search Address Book by Name (Last Resort)
            const targetName = (chatData?.name || chatData?.pushName || chatData?.verifiedName);
            if (targetName) {
                console.log(`🕵️ Deep Hunt: Searching Address Book for "${targetName}"...`);
                try {
                    const contacts = await this.fetchContacts();
                    if (Array.isArray(contacts)) {
                        const cleanName = (n) => String(n || "").toLowerCase().trim();
                        const searchName = cleanName(targetName);

                        const match = contacts.find(c => {
                            const cName = cleanName(c.name || c.pushName);
                            return cName === searchName && c.id && c.id.includes('@s.whatsapp.net') && !c.id.includes('@lid');
                        });

                        if (match) {
                            const extracted = match.id.split('@')[0];
                            console.log(`✅ Deep Hunt FOUND via Contact Name: ${extracted}`);
                            this.setManualPhoneMapping(jid, extracted, chatData);
                            return extracted;
                        }
                    }
                } catch (e) {
                    console.error("Deep Hunt Error:", e);
                }
            }
        }

        // 4. Stop here and ask for manual mapping in UI
        return null;
    }

    getSendHints(chatData = null) {
        if (!chatData) return [];
        const hints = [
            chatData?.remoteJidAlt,
            chatData?.sendTargetJid,
            chatData?.lastMessage?.key?.remoteJidAlt,
            chatData?.lastMessage?.remoteJidAlt,
            chatData?.lastMessage?.key?.participant,
            chatData?.participant,
        ]
            .map((candidate) => this.standardizeJid(candidate))
            .filter((candidate) => candidate && candidate.includes('@s.whatsapp.net'));

        return [...new Set(hints)];
    }

    buildSendCandidates({ targetJid, linkedLid, verifiedJid, phoneNumber, lidContext, sendHints = [] }) {
        const candidates = [];
        const push = (value) => {
            if (!value) return;
            candidates.push(String(value).trim());
        };

        // Evolution-friendly order: LID route first when available.
        if (lidContext) {
            push(linkedLid);
            push(targetJid);
            push(verifiedJid);
            sendHints.forEach(push);

            return [...new Set(candidates.filter(Boolean))];
        }

        push(targetJid);
        push(verifiedJid);
        sendHints.forEach(push);

        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        if (normalizedPhone) {
            push(normalizedPhone);
            push(`${normalizedPhone}@s.whatsapp.net`);
        }

        // If target is a phone jid, keep both phone and jid variants.
        if (targetJid?.includes('@s.whatsapp.net')) {
            const digits = this.normalizePhoneNumber(targetJid.split('@')[0]);
            if (digits) {
                push(digits);
                push(`${digits}@s.whatsapp.net`);
            }
        }

        return [...new Set(candidates.filter(Boolean))];
    }

    async sendTextWithFallback(instanceName, text, candidates = []) {
        const queue = [...new Set((candidates || []).filter(Boolean))];
        const attemptedSet = new Set();
        let lastFailure = null;
        let pointer = 0;

        while (pointer < queue.length) {
            const candidate = queue[pointer++];
            if (attemptedSet.has(candidate)) continue;
            attemptedSet.add(candidate);

            const result = await this.request(`/message/sendText/${instanceName}`, 'POST', {
                number: candidate,
                text
            });

            const existencePayload =
                result?.response?.message?.[0] ||
                result?.response?.message ||
                result?.message?.[0] ||
                result?.message ||
                null;

            const notFound = existencePayload?.exists === false;
            if (!notFound) {
                return { result, attempted: candidate };
            }

            lastFailure = { result, attempted: candidate };

            // If LID route fails, ask Evolution for canonical routing and enqueue returned targets.
            if (String(candidate).includes('@lid')) {
                const verify = await this.verifyWhatsAppNumber(candidate);
                const extraCandidates = [];
                if (verify?.jid) extraCandidates.push(verify.jid);
                if (verify?.exists && verify?.number) {
                    extraCandidates.push(verify.number);
                    extraCandidates.push(`${verify.number}@s.whatsapp.net`);
                }

                for (const extra of extraCandidates) {
                    if (extra && !attemptedSet.has(extra) && !queue.includes(extra)) {
                        queue.push(extra);
                    }
                }
            }
        }

        return lastFailure || { result: null, attempted: queue[0] || null };
    }

    persistSuccessfulRoute(baseJid, attempted, chatData = null) {
        const attemptedJid = this.standardizeJid(attempted);
        if (!attemptedJid) return;

        const attemptedPhone = this.extractPhoneNumber(attemptedJid, chatData);
        if (attemptedPhone) {
            this.setManualPhoneMapping(baseJid, attemptedPhone, chatData);
            if (chatData?.linkedLid) this.setManualPhoneMapping(chatData.linkedLid, attemptedPhone, chatData);
        }

        const state = useStore.getState();
        const currentChats = Array.isArray(state.chats) ? state.chats : [];
        const baseNum = this.getNum(baseJid || chatData?.id || chatData?.remoteJid);
        const attemptedNum = this.getNum(attemptedJid);

        if (!baseNum && !attemptedNum) return;

        const updatedChats = currentChats.map((chat) => {
            const chatNums = [
                chat?.id,
                chat?.jid,
                chat?.remoteJid,
                chat?.linkedLid,
                chat?.sendTargetJid,
                chat?.remoteJidAlt,
            ].map((value) => this.getNum(value)).filter(Boolean);

            const isSameLogicalChat =
                (baseNum && chatNums.includes(baseNum)) ||
                (attemptedNum && chatNums.includes(attemptedNum));

            if (!isSameLogicalChat) return chat;

            return {
                ...chat,
                sendTargetJid: attemptedJid,
                remoteJidAlt: attemptedJid.includes('@s.whatsapp.net') ? attemptedJid : (chat?.remoteJidAlt || null),
                phoneNumber: attemptedPhone || chat?.phoneNumber,
            };
        });

        state.setChats(updatedChats);
        const activeChat = state.activeChat;
        if (activeChat) {
            const activeNum = this.getNum(activeChat?.id || activeChat?.remoteJid || activeChat?.jid);
            if (activeNum && (activeNum === baseNum || activeNum === attemptedNum)) {
                useStore.setState({
                    activeChat: {
                        ...activeChat,
                        sendTargetJid: attemptedJid,
                        remoteJidAlt: attemptedJid.includes('@s.whatsapp.net') ? attemptedJid : (activeChat?.remoteJidAlt || null),
                        phoneNumber: attemptedPhone || activeChat?.phoneNumber,
                    },
                });
            }
        }
    }

    async sendMessage(jid, text, chatData = null) {
        const { instanceName, chats } = useStore.getState();
        if (!instanceName || !jid || !text) return null;
        let targetJid = chatData?.sendTargetJid || jid;
        const isLidJid = targetJid.includes('@lid');
        const lidContextJid = isLidJid ? targetJid : (chatData?.linkedLid || null);
        const isDirectPhoneJid = targetJid.includes('@s.whatsapp.net') && !targetJid.includes('@lid');
        let lidVerification = null;

        // Fetch complete chat data from store if not provided
        if (!chatData && chats) {
            chatData = chats.find(c => (c.id === jid || c.remoteJid === jid || c.jid === jid));
        }

        // CRITICAL: Extract phone number with Smart Scan Fallback
        let phoneNumber = await this.ensurePhoneNumber(targetJid, chatData);
        const sendHints = this.getSendHints(chatData);

        // For direct number chats, ask Evolution to validate/normalize before send.
        if (isDirectPhoneJid && !lidContextJid) {
            const directDigits = this.normalizePhoneNumber(targetJid.split('@')[0]);
            const verify = await this.verifyWhatsAppNumber(directDigits || targetJid);

            if (verify?.exists === false) {
                return {
                    error: true,
                    invalidRecipient: true,
                    needsPhoneNumber: false,
                    message: `Número ${directDigits || targetJid} não existe no WhatsApp ou está indisponível.`,
                    attemptedPhone: directDigits || phoneNumber,
                    jid,
                };
            }

            if (verify?.number) phoneNumber = verify.number;
        }

        // For LID chats, try official verification to resolve phone.
        if (lidContextJid) {
            lidVerification = await this.verifyWhatsAppNumber(lidContextJid);
            if (lidVerification?.exists && lidVerification?.number) {
                phoneNumber = lidVerification.number;
                this.setManualPhoneMapping(lidContextJid, lidVerification.number, chatData);
            }

            // Guard against fake @s route derived from the same LID digits.
            if (
                targetJid?.includes('@s.whatsapp.net') &&
                this.isLidDerivedPhone(this.getNum(targetJid), lidContextJid) &&
                lidVerification?.exists !== true
            ) {
                targetJid = lidContextJid;
            }
        }

        const sendCandidates = this.buildSendCandidates({
            targetJid,
            linkedLid: lidContextJid,
            verifiedJid: lidVerification?.jid || null,
            phoneNumber,
            lidContext: Boolean(lidContextJid),
            sendHints,
        });

        const hasTrustedPhoneRoute = sendCandidates.some((candidate) => {
            const normalized = this.standardizeJid(candidate);
            return normalized?.includes('@s.whatsapp.net');
        });

        // Preflight guard for legacy Evolution versions that cannot resolve @lid sends reliably.
        if (lidContextJid && !hasTrustedPhoneRoute) {
            const serverInfo = await this.getServerInfo();
            const serverVersion = serverInfo?.version || null;
            if (serverVersion && this.isVersionLessThan(serverVersion, '2.3.7')) {
                return {
                    error: true,
                    invalidRecipient: true,
                    needsPhoneNumber: false,
                    legacyLidLimitation: true,
                    message: `Envio bloqueado para contato @lid nesta versão da Evolution (${serverVersion}). Atualize para >= 2.3.7 para envio confiável em contatos desconhecidos.`,
                    attemptedPhone: targetJid,
                    jid,
                };
            }
        }

        if (sendCandidates.length === 0) {
            return {
                error: true,
                message: `❌ Destinatário não resolvido para envio.`,
                needsPhoneNumber: !(isDirectPhoneJid || isLidJid),
                suggestedPhone: this.normalizePhoneNumber(jid?.split('@')[0]),
                jid,
            };
        }

        const { result, attempted } = await this.sendTextWithFallback(instanceName, text, sendCandidates);

        // Check for "number doesn't exist" error
        if (result?.response?.message?.[0]?.exists === false) {
            const isLidAttempt = String(attempted || '').includes('@lid') || String(targetJid || '').includes('@lid');
            let lidHint = '';
            if (isLidAttempt) {
                const serverInfo = await this.getServerInfo();
                const serverVersion = serverInfo?.version || null;
                if (serverVersion && this.isVersionLessThan(serverVersion, '2.3.7')) {
                    lidHint = `\n\nServidor Evolution ${serverVersion} detectado. Essa versão tem limitação conhecida com contatos @lid. Atualize para >= 2.3.7 para envio confiável em contatos desconhecidos.`;
                }
            }
            return {
                error: true,
                message: `Número ${attempted || phoneNumber} não existe no WhatsApp ou não está acessível.${lidHint}`,
                needsPhoneNumber: !(isDirectPhoneJid || isLidJid),
                invalidRecipient: isDirectPhoneJid || isLidJid,
                attemptedPhone: attempted || phoneNumber,
                suggestedPhone: this.normalizePhoneNumber(jid?.split('@')[0]),
                jid
            };
        }

        this.persistSuccessfulRoute(jid, attempted, chatData);
        return result;
    }

    async sendMedia(jid, file, caption = '', isAudio = false) {
        const { instanceName, chats } = useStore.getState();
        if (!instanceName || !jid || !file) return null;

        try {
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
            if (isAudio || file.type.startsWith('audio/')) mediatype = 'audio';
            else if (file.type.startsWith('image/')) mediatype = 'image';
            else if (file.type.startsWith('video/')) mediatype = 'video';

            const rawJid = String(jid).replace(/^(phone:|jid:)/, '');
            const cleanJid = this.standardizeJid(rawJid);
            if (!cleanJid) return { error: true, message: 'Destinatário inválido para envio de mídia.' };

            const chatData = Array.isArray(chats)
                ? chats.find((c) => c.id === jid || c.id === cleanJid || c.remoteJid === jid || c.remoteJid === cleanJid || c.jid === jid || c.jid === cleanJid)
                : null;

            let phoneNumber = await this.ensurePhoneNumber(cleanJid, chatData);
            const sendHints = this.getSendHints(chatData);
            const linkedLid = cleanJid.includes('@lid') ? cleanJid : (chatData?.linkedLid || null);

            const sendCandidates = this.buildSendCandidates({
                targetJid: chatData?.sendTargetJid || cleanJid,
                linkedLid,
                verifiedJid: null,
                phoneNumber,
                lidContext: Boolean(linkedLid),
                sendHints,
            });

            const audioProfiles = [
                { mimetype: file.type || 'audio/webm', fileName: file.name || 'voice_message.webm' },
                { mimetype: 'audio/ogg;codecs=opus', fileName: 'voice_message.ogg' },
                { mimetype: 'audio/mp4', fileName: 'voice_message.m4a' },
            ];

            const genericProfile = { mimetype: file.type || 'application/octet-stream', fileName: file.name || 'arquivo' };
            const profiles = mediatype === 'audio' ? audioProfiles : [genericProfile];

            let lastError = null;
            for (const number of sendCandidates) {
                if (mediatype === 'audio') {
                    const audioPayload = {
                        number,
                        audio: base64,
                        encoding: true,
                        options: { delay: 1200, presence: 'recording' },
                    };

                    const audioResult = await this.request(`/message/sendWhatsAppAudio/${instanceName}`, 'POST', audioPayload);
                    if (audioResult && !audioResult.error) {
                        this.persistSuccessfulRoute(cleanJid, number, chatData);
                        return audioResult;
                    }
                    lastError = audioResult;
                }

                for (const profile of profiles) {
                    const payload = {
                        number,
                        mediatype,
                        mimetype: profile.mimetype,
                        caption: mediatype === 'audio' ? '' : (caption || file.name),
                        fileName: profile.fileName,
                        media: base64,
                        options: mediatype === 'audio'
                            ? { ptt: true, delay: 1200, presence: 'recording' }
                            : { delay: 1200, presence: 'composing' },
                    };

                    if (mediatype === 'audio') payload.ptt = true; // legacy support

                    const result = await this.request(`/message/sendMedia/${instanceName}`, 'POST', payload);
                    if (result && !result.error) {
                        this.persistSuccessfulRoute(cleanJid, number, chatData);
                        return result;
                    }
                    lastError = result;
                }
            }

            return {
                error: true,
                message: lastError?.message || 'Falha ao enviar áudio/mídia.',
                details: lastError,
            };
        } catch (e) {
            console.error("Send Media Error:", e);
            return { error: true, message: e.message || 'Erro inesperado ao enviar mídia.' };
        }
    }
}

export default new WhatsAppService();
