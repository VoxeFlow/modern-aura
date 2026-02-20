export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userEmail = request.headers.get('X-User-Email');

    try {
        // Se for admin, vê tudo? Ou filtra?
        // Lógica V1: Retorna produtos globais (owner_id IS NULL) + produtos do usuário
        let query = 'SELECT * FROM products WHERE owner_id IS NULL';
        let params = [];

        if (userEmail && !userEmail.includes('admin')) {
            query += ' OR owner_id = ?';
            params.push(userEmail);
        } else if (userEmail && userEmail.includes('admin')) {
            // Admin vê tudo
            query = 'SELECT * FROM products';
            params = [];
        }

        const { results } = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const data = await request.json();
        const { id, name, price, description_detailed, benefits_list, faq_list, rag_files, image_url, link } = data;

        // Se admin, owner_id pode ser NULL (Global). Se cliente, owner_id = email.
        const ownerId = userEmail.includes('admin') ? (data.owner_id || null) : userEmail;

        await env.DB.prepare(`
      INSERT INTO products (id, owner_id, name, price, description_detailed, benefits_list, faq_list, rag_files, image_url, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        price = excluded.price,
        description_detailed = excluded.description_detailed,
        benefits_list = excluded.benefits_list,
        faq_list = excluded.faq_list,
        rag_files = excluded.rag_files,
        image_url = excluded.image_url,
        link = excluded.link
    `).bind(
            id || crypto.randomUUID(),
            ownerId,
            name,
            price,
            description_detailed,
            JSON.stringify(benefits_list || []),
            JSON.stringify(faq_list || []),
            JSON.stringify(rag_files || []),
            image_url,
            link
        ).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
