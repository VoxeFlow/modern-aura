export async function onRequestGet(context) {
    // List Users (Admin Only)
    const { request, env } = context;
    const userEmail = request.headers.get('X-User-Email');

    // Simple security: check if requester is admin. 
    // Ideally we verify a token, but for now we trust X-User-Email sent from client (which acts as our session in this MVP)
    // AND we check if that email is actually an admin in DB.

    if (!userEmail) return new Response('Unauthorized', { status: 401 });

    const requester = await env.DB.prepare('SELECT role FROM users WHERE email = ?').bind(userEmail).first();
    if (requester?.role !== 'admin') return new Response('Forbidden', { status: 403 });

    try {
        const { results } = await env.DB.prepare('SELECT id, email, role, approved, created_at FROM users ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    // Approve User
    const { request, env } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) return new Response('Unauthorized', { status: 401 });

    const requester = await env.DB.prepare('SELECT role FROM users WHERE email = ?').bind(userEmail).first();
    if (requester?.role !== 'admin') return new Response('Forbidden', { status: 403 });

    try {
        const { userId, approve } = await request.json();

        await env.DB.prepare('UPDATE users SET approved = ? WHERE id = ?')
            .bind(approve ? 1 : 0, userId)
            .run();

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
