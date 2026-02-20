/**
 * O MONSTRO - CRM Stages API
 * Manage Kanban Columns (Stages)
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Auth Check
    const userEmail = request.headers.get('X-User-Email');
    if (!userEmail) {
        return new Response('Unauthorized', { status: 401 });
    }

    // GET: List Stages
    if (request.method === 'GET') {
        try {
            const results = await env.DB.prepare('SELECT * FROM crm_stages WHERE owner_id = ? ORDER BY position ASC, created_at ASC')
                .bind(userEmail)
                .all();

            let stages = results.results || [];

            // If no stages, create defaults
            if (stages.length === 0) {
                const defaults = [
                    { id: 'novo', name: 'Novo Lead', color: '#C5A059', position: 0 },
                    { id: 'qualificado', name: 'Qualificado', color: '#d4af6a', position: 1 },
                    { id: 'proposta', name: 'Proposta Enviada', color: '#af8a43', position: 2 },
                    { id: 'agendado', name: 'Agendado', color: '#c09850', position: 3 },
                    { id: 'fechado', name: 'Fechado', color: '#e0c080', position: 4 },
                    { id: 'perdido', name: 'Perdido', color: '#8a6d3a', position: 5 }
                ];

                const stmt = env.DB.prepare('INSERT INTO crm_stages (id, owner_id, name, color, position) VALUES (?, ?, ?, ?, ?)');
                const batch = defaults.map(d => stmt.bind(d.id, userEmail, d.name, d.color, d.position));
                await env.DB.batch(batch);
                return new Response(JSON.stringify(defaults), { status: 200 });
            }

            return new Response(JSON.stringify(stages), { status: 200 });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // PUT: Update Stages (Sync full list or single update)
    if (request.method === 'PUT') {
        try {
            const body = await request.json();

            // Scenario 1: Sync Full List (Reordering)
            if (Array.isArray(body)) {
                // Delete all and re-insert is easiest for reordering, but risky if IDs change. 
                // Better: Update positions.
                // Simplified: We assume the client sends the full definitive list.
                // For MVP: We upsert based on ID.

                const stmt = env.DB.prepare(`
                    INSERT INTO crm_stages (id, owner_id, name, color, position) 
                    VALUES (?, ?, ?, ?, ?) 
                    ON CONFLICT(id) DO UPDATE SET 
                    name=excluded.name, color=excluded.color, position=excluded.position
                `);

                const batch = body.map((s, index) => stmt.bind(s.id, userEmail, s.name, s.color || '#86868b', index));
                await env.DB.batch(batch);
                return new Response('Synced', { status: 200 });
            }

            // Scenario 2: Single Update (Rename)
            if (body.id && body.name) {
                await env.DB.prepare('UPDATE crm_stages SET name = ? WHERE id = ? AND owner_id = ?')
                    .bind(body.name, body.id, userEmail)
                    .run();
                return new Response('Updated', { status: 200 });
            }

            // Scenario 3: Create New
            if (body.name && !body.id) {
                const newId = `col-${Date.now()}`;
                await env.DB.prepare('INSERT INTO crm_stages (id, owner_id, name, position) VALUES (?, ?, ?, 99)')
                    .bind(newId, userEmail, body.name)
                    .run();
                return new Response(JSON.stringify({ id: newId }), { status: 200 });
            }

            return new Response('Invalid Request', { status: 400 });

        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response('Method Not Allowed', { status: 405 });
}
