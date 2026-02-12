export async function onRequest(context) {
    const { request, env } = context;

    // 1. Only allow POST requests
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        // Production-safe: never read client-prefixed env vars here.
        const apiKey = env.OPENAI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "OpenAI API Key not configured in Cloudflare environment (OPENAI_API_KEY)" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Proxy to OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
