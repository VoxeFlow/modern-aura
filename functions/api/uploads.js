export async function onRequestPost(context) {
    const { request, env } = context;
    const userEmail = request.headers.get('X-User-Email');

    if (!userEmail) return new Response('Unauthorized', { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return new Response('No file uploaded', { status: 400 });

        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

        // Check if BUCKET is bound (R2)
        if (env.BUCKET) {
            await env.BUCKET.put(fileName, file.stream(), {
                httpMetadata: { contentType: file.type }
            });
            // Public URL (assuming R2 domain is configured or we use a worker proxy)
            // For now, we return the key, and the system knows how to retrieve it.
            return new Response(JSON.stringify({
                key: fileName,
                url: `/api/uploads/${fileName}`, // We need a GET endpoint to serve this if not public
                storage: 'r2'
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Fallback or Error if no R2
        return new Response(JSON.stringify({ error: 'R2 Bucket not configured' }), { status: 500 });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

// Handler for GET (Serving the file)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    // We might need to handle path params or query.
    // Since this is a file `api/uploads.js`, it handles /api/uploads.
    // To handle /api/uploads/FILENAME, we need a dynamic route `api/uploads/[filename].js`
    // OR we use query param ?key=...

    // Let's use query param for simplicity in this single file or simple routing.
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key || !env.BUCKET) return new Response('Not found', { status: 404 });

    const object = await env.BUCKET.get(key);
    if (!object) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
}
