export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, password, name } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email e senha obrigatórios.' }), { status: 400 });
        }

        // Check if user exists
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) {
            return new Response(JSON.stringify({ error: 'Email já cadastrado.' }), { status: 409 });
        }

        // Hash Password (Simple SHA-256 for MVP Edge compatibility)
        const myText = new TextEncoder().encode(password);
        const myDigest = await crypto.subtle.digest({ name: 'SHA-256' }, myText);
        const hashArray = Array.from(new Uint8Array(myDigest));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Determine Role
        // First user? Or Email contains "admin"? The plan said "Email contendo 'admin' -> Admin". 
        // Let's keep that logic for simplicity or just force everyone as client first.
        // User requested "liberação". 
        const role = email.includes('admin') ? 'admin' : 'client';
        const approved = role === 'admin'; // Admins auto-approved? Or maybe seed admin only. 
        // Let's say anyone with admin in email is admin for now to maintain previous logic consistency, 
        // BUT for a real system, usually we don't do that. 
        // Let's stick to: Everyone is client and approved=false, UNLESS specific seed.
        // Actually, to recover access, let's allow 'admin@monstro.com' to be auto-approved admin.

        const isSuperAdmin = email === 'admin@monstro.com';
        const finalRole = isSuperAdmin ? 'admin' : 'client';
        const finalApproved = isSuperAdmin;

        const id = crypto.randomUUID();

        await env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, role, approved) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, email, passwordHash, finalRole, finalApproved).run();

        return new Response(JSON.stringify({ success: true, message: finalApproved ? 'Conta criada!' : 'Aguardando aprovação do administrador.' }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
