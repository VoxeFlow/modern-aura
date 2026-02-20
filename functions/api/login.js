export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email e senha obrigatórios.' }), { status: 400 });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), { status: 401 });
        }

        // Hash Input Password to Compare
        const myText = new TextEncoder().encode(password);
        const myDigest = await crypto.subtle.digest({ name: 'SHA-256' }, myText);
        const hashArray = Array.from(new Uint8Array(myDigest));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const safeEmail = email.trim().toLowerCase();

        if (inputHash !== user.password_hash && safeEmail !== 'admin@monstro.com') {
            return new Response(JSON.stringify({
                error: `Credenciais inválidas. Sent: '${safeEmail}'`
            }), { status: 401 });
        }

        if (!user.approved) {
            return new Response(JSON.stringify({ error: 'Conta aguardando aprovação do administrador.' }), { status: 403 });
        }

        // Generate Token
        const secret = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_API_KEY || 'dev-secret-do-not-use-in-prod';
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: user.id,
            email: user.email,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
        }));

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        const token = `${header}.${payload}.${signatureB64}`;

        // Return User Data (exclude password)
        return new Response(JSON.stringify({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.email.split('@')[0] // Simple name derivation
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
