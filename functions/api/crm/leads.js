export async function onRequestGet(context) {
    const { env, request } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        const { results } = await env.DB.prepare('SELECT * FROM leads WHERE owner_id = ? ORDER BY last_interaction DESC').bind(userEmail).all();
        return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    // Optional: Manual Create Lead
    return new Response('Not Implemented', { status: 501 });
}

export async function onRequestPut(context) {
    // Toggle AI Status or Update Status
    const { env, request } = context;
    const userEmail = request.headers.get('X-User-Email');
    if (!userEmail) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        const { id, ai_active, status } = await request.json();

        if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

        // Ensure ownership
        const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ? AND owner_id = ?').bind(id, userEmail).first();
        if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

        if (ai_active !== undefined) {
            await env.DB.prepare('UPDATE leads SET ai_active = ? WHERE id = ?').bind(ai_active ? 1 : 0, id).run();
        }

        if (status) {
            await env.DB.prepare('UPDATE leads SET status = ? WHERE id = ?').bind(status, id).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
