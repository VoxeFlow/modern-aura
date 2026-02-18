export async function onRequest(context) {
    const { results } = await context.env.DB.prepare(
        "SELECT * FROM products ORDER BY price ASC"
    ).all();

    // Parse JSON columns
    const products = results.map(p => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        notFeatures: JSON.parse(p.not_features || '[]'),
        highlight: Boolean(p.highlight)
    }));

    return new Response(JSON.stringify(products), {
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const body = await request.json();
    const { id, price, link, highlight } = body;

    try {
        let query = "UPDATE products SET ";
        const params = [];
        const updates = [];

        if (price !== undefined) { updates.push("price = ?"); params.push(price); }
        if (link !== undefined) { updates.push("link = ?"); params.push(link); }
        if (highlight !== undefined) { updates.push("highlight = ?"); params.push(highlight ? 1 : 0); }

        if (updates.length === 0) return new Response("No changes", { status: 400 });

        query += updates.join(", ") + " WHERE id = ?";
        params.push(id);

        await env.DB.prepare(query).bind(...params).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
