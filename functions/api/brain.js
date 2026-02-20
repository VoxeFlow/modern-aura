export async function onRequestGet(context) {
    const { env, request } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        const brain = await env.DB.prepare('SELECT * FROM brains WHERE owner_id = ?').bind(userEmail).first();
        return new Response(JSON.stringify(brain || {}), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        const { persona, business_name, business_description, tone, rag_files } = await request.json();

        // Upsert logic
        const existing = await env.DB.prepare('SELECT id FROM brains WHERE owner_id = ?').bind(userEmail).first();

        // Ensure rag_files is a string for storage
        const filesJson = typeof rag_files === 'string' ? rag_files : JSON.stringify(rag_files || []);

        if (existing) {
            await env.DB.prepare('UPDATE brains SET persona = ?, business_name = ?, business_description = ?, tone = ?, rag_files = ? WHERE owner_id = ?')
                .bind(persona, business_name, business_description, tone, filesJson, userEmail)
                .run();
        } else {
            await env.DB.prepare('INSERT INTO brains (owner_id, persona, business_name, business_description, tone, rag_files) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(userEmail, persona, business_name, business_description, tone, filesJson)
                .run();
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
