export async function onRequestGet(context) {
    const { env } = context;

    try {
        const entries = await env.DB.prepare('SELECT * FROM config').all();

        // Transform Array to Object { key: value }
        const config = {};
        if (entries.results) {
            entries.results.forEach(entry => {
                config[entry.key] = entry.value;
            });
        }

        return new Response(JSON.stringify(config), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const payload = await request.json();

        // Upsert each key
        const stmt = env.DB.prepare(`
            INSERT INTO config (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);

        const updates = [];
        for (const [key, value] of Object.entries(payload)) {
            updates.push(stmt.bind(key, value));
        }

        await env.DB.batch(updates);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
