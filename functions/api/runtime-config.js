function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

export async function onRequestGet(context) {
    const { env } = context;
    // Only expose public-safe client config here.
    return json({
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
    });
}

