
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const event = body?.event;
        const data = body?.data;
        const message = data?.message?.conversation || data?.message?.extendedTextMessage?.text || data?.message?.text;
        const fromMe = data?.key?.fromMe;

        // Skip non-message noise without updating trace
        if (event !== 'messages.upsert' && !message) {
            return new Response('Noise Ignored', { status: 200 });
        }

        if (!message || fromMe) {
            return new Response('Ignored', { status: 200 });
        }

        const url = new URL(request.url);
        const queryInstance = url.searchParams.get("instance") || url.searchParams.get("id");
        const instanceName = body.instance || queryInstance;
        const sender = data?.key?.remoteJid;

        // Reset Trace for NEW message
        try {
            await env.DB.prepare("DELETE FROM config WHERE key LIKE 'trace_%'").run();
            await env.DB.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('debug_last_payload', ?)").bind(JSON.stringify(body)).run();
        } catch (e) { }

        const log = async (step, msg) => {
            try {
                await env.DB.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)")
                    .bind(`trace_${step}`, msg).run();
            } catch (e) { }
        };

        await log(1, "Payload Parsed");

        // 1. Identify Owner
        let ownerEmail = null;
        let evolutionKey = null;

        const info = await env.DB.prepare('SELECT owner_email, api_key FROM instances WHERE instance_name = ?')
            .bind(instanceName).first();

        if (info) {
            ownerEmail = info.owner_email;
            evolutionKey = info.api_key;
            await log(2, `Owner Found: ${ownerEmail}`);
        } else {
            const admin = await env.DB.prepare("SELECT owner_email FROM instances LIMIT 1").first();
            ownerEmail = admin?.owner_email;
            await log(2, `Fallback Owner: ${ownerEmail}`);
        }

        if (!ownerEmail) return new Response('No Owner', { status: 200 });

        // 2. Configs
        const evolutionUrlConfig = await env.DB.prepare("SELECT value FROM config WHERE key = 'evolution_api_url'").first();
        const evolutionGlobalKey = await env.DB.prepare("SELECT value FROM config WHERE key = 'evolution_api_key'").first();
        const evolutionUrl = (evolutionUrlConfig?.value || env.EVOLUTION_API_URL).replace(/\/$/, '');
        const evolutionAuth = evolutionKey || evolutionGlobalKey?.value || env.EVOLUTION_API_KEY;

        const evoHeaders = { 'Content-Type': 'application/json', 'apikey': evolutionAuth };

        // 3. AI Check (Labels & Handover)
        let labels = [];
        let isAiActive = false; // Default to INACTIVE for existing conversations

        try {
            const chatRes = await fetch(`${evolutionUrl}/chat/find/${instanceName}`, {
                method: 'POST',
                headers: evoHeaders,
                body: JSON.stringify({ "where": { "id": sender } })
            });

            await log(3, `Label Check Status: ${chatRes.status}`);

            if (chatRes.ok) {
                const chatData = await chatRes.json();
                labels = chatData?.[0]?.labels || [];

                const labelNames = labels.map(l => (typeof l === 'string' ? l : l.name || '')).filter(Boolean);
                await log(4, `Labels: ${labelNames.join(', ')}`);

                const hasActiveLabel = labelNames.some(l => l.toLowerCase() === 'ia_ativa');
                const hasOffLabel = labelNames.some(l => l.toLowerCase() === 'ia_off');

                if (hasActiveLabel && !hasOffLabel) {
                    isAiActive = true;
                    await log(5, "AI Enabled by Label");
                } else {
                    await log(5, `AI Paused (A:${hasActiveLabel}, O:${hasOffLabel})`);
                }
            } else {
                await log(4, "Chat not found - Handover Active");
            }
        } catch (e) {
            await log(3, "Label check error: " + e.message);
        }

        // 4. CRM / Lead Sync
        let lead = await env.DB.prepare('SELECT * FROM leads WHERE phone = ? AND owner_id = ?').bind(sender, ownerEmail).first();

        if (!lead) {
            // New Lead -> Auto Activate & Auto Label
            const firstStage = await env.DB.prepare('SELECT name FROM crm_stages WHERE owner_id = ? ORDER BY position ASC LIMIT 1').bind(ownerEmail).first();
            await env.DB.prepare('INSERT INTO leads (owner_id, phone, name, last_message, ai_active, stage) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(ownerEmail, sender, data?.pushName || 'Novo Lead', message, 1, firstStage?.name || 'lead')
                .run();

            try {
                await fetch(`${evolutionUrl}/chat/update/${instanceName}`, {
                    method: 'POST',
                    headers: evoHeaders,
                    body: JSON.stringify({ where: { id: sender }, labels: ['ia_ativa'] })
                });
                isAiActive = true;
                await log(6, "New Lead - AI Auto-Activated & Labeled");
            } catch (e) { }
        } else {
            // Existing Lead: Sync Activity
            await env.DB.prepare('UPDATE leads SET last_message = ?, last_interaction = CURRENT_TIMESTAMP WHERE id = ?')
                .bind(message, lead.id).run();

            // Database override (if user manually disabled in CRM)
            if (lead.ai_active === 0) {
                isAiActive = false;
                await log(6, "AI Overridden to OFF by DB");
            }
        }

        await log(7, isAiActive ? "FINAL: AI ON" : "FINAL: AI OFF");
        if (!isAiActive) return new Response('Handover Active', { status: 200 });

        // 5. History
        let history = [];
        try {
            const hRes = await fetch(`${evolutionUrl}/chat/fetchMessages/${instanceName}`, {
                method: 'POST',
                headers: evoHeaders,
                body: JSON.stringify({ where: { id: sender }, limit: 10 })
            });
            if (hRes.ok) {
                const hData = await hRes.json();
                const msgs = hData.messages || hData || [];
                history = Array.isArray(msgs) ? msgs.map(m => ({
                    role: m.key?.fromMe ? 'assistant' : 'user',
                    content: m.message?.conversation || m.message?.extendedTextMessage?.text || ""
                })).filter(h => h.content).reverse() : [];
            }
        } catch (e) { }

        await log(6, `History: ${history.length} msgs`);

        // 6. RAG Context (Knowledge Base)
        let productContext = "";
        let knowledgeBase = "";
        try {
            const brain = await env.DB.prepare('SELECT * FROM brains WHERE owner_id = ?').bind(ownerEmail).first();
            const products = await env.DB.prepare('SELECT name, price, link FROM products WHERE owner_id = ?').bind(ownerEmail).all();

            if (brain?.persona) productContext = brain.persona;
            productContext += "\n\n### PRODUTOS DISPONÍVEIS\n" + products.results.map(p => `- ${p.name}: R$ ${p.price} (Link: ${p.link})`).join('\n');

            // Fetch RAG Files from R2 if configured
            const ragFiles = JSON.parse(brain?.rag_files || "[]");
            if (ragFiles.length > 0 && env.BUCKET) {
                await log(7, `Fetching ${ragFiles.length} RAG files`);
                for (const file of ragFiles) {
                    const obj = await env.BUCKET.get(file.key || file);
                    if (obj) {
                        const text = await obj.text();
                        knowledgeBase += `\n--- DOCUMENTO: ${file.name || 'Conhecimento'} ---\n${text}\n`;
                    }
                }
            }
        } catch (e) { await log(7, "RAG Error: " + e.message); }

        const systemPrompt = `${productContext}\n\n### CONHECIMENTO ADICIONAL\n${knowledgeBase || "Nenhum arquivo adicional."}\n\nResponda sempre de forma curta e objetiva.`;

        await log(8, "System Prompt Prepared");

        // 7. OpenAI
        const okey = await env.DB.prepare("SELECT value FROM config WHERE key = 'openai_key'").first();
        const apiKey = (okey?.value || env.OPENAI_API_KEY)?.trim();

        if (!apiKey) return new Response('No Key', { status: 200 });

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history,
                    { role: 'user', content: message }
                ]
            })
        });

        const aiData = await aiResponse.json();
        const replyText = aiData.choices?.[0]?.message?.content;

        if (!replyText) {
            await log(8, "OpenAI Error: " + JSON.stringify(aiData.error || 'No content'));
            return new Response('No AI', { status: 200 });
        }

        await log(9, "Got Reply: " + replyText.substring(0, 20));

        // 7. Evolution Reply
        const sent = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: evoHeaders,
            body: JSON.stringify({ number: sender, text: replyText })
        });

        await log(10, `Evolution Status: ${sent.status}`);
        if (sent.status >= 400) {
            const errBody = await sent.text();
            await log(11, `Evolution Error: ${errBody.substring(0, 100)}`);
        }

        return new Response('OK', { status: 200 });

    } catch (e) {
        try {
            await env.DB.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('debug_last_error', ?)").bind(e.message).run();
        } catch (err) { }
        return new Response('Crash', { status: 500 });
    }
}
