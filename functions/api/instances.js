export async function onRequestPost(context) {
    const { request, env } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { instanceName, apiKey } = await request.json();

        if (!instanceName) {
            return new Response(JSON.stringify({ error: 'Instance Name required' }), { status: 400 });
        }

        await env.DB.prepare(`
            INSERT INTO instances (instance_name, owner_email, api_key)
            VALUES (?, ?, ?)
            ON CONFLICT(instance_name) DO UPDATE SET
                owner_email = excluded.owner_email,
                api_key = excluded.api_key
        `).bind(instanceName, userEmail, apiKey || null).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
