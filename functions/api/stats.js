export async function onRequestGet(context) {
    const { env, request } = context;
    const userEmail = request.headers.get('X-User-Email');
    console.log(`[Stats] Fetching for: ${userEmail}`);

    if (!userEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        // 1. Get User Role
        const user = await env.DB.prepare('SELECT role FROM users WHERE email = ?').bind(userEmail).first();
        if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

        const isAdmin = user.role === 'admin';

        // 2. Fetch Real Stats
        // Queries counting actual rows. If tables are empty, returns 0.

        let leadCount = 0;
        let salesTotal = 0;
        let activeClients = 0;

        try {
            if (isAdmin) {
                // Admin sees TOTALs
                leadCount = await env.DB.prepare('SELECT COUNT(*) as count FROM leads').first().then(r => r.count || 0);
                // Assuming we might have a sales table later, for now we don't have one, so 0.
                // activeClients = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').bind('active').first().then(r => r.count || 0);
                activeClients = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first().then(r => r.count || 0);
            } else {
                // Client sees THEIR data (mocked filter for now as leads don't have owner_id yet in simple schema)
                // For now, return 0 for clients until we link leads to users.
                leadCount = 0;
            }
        } catch (e) {
            console.log('Error fetching stats:', e);
            // Fallback to 0
        }

        const stats = {
            leads: {
                total: leadCount,
                growth: 0, // No historical data yet
                today: 0   // Needs date filtering logic
            },
            sales: {
                total: salesTotal,
                active_clients: activeClients,
                revenue_growth: 0
            },
            conversion: {
                rate: 0,
                status: 'Sem dados'
            },
            history: [
                { name: 'Seg', leads: 0, sales: 0 },
                { name: 'Ter', leads: 0, sales: 0 },
                { name: 'Qua', leads: 0, sales: 0 },
                { name: 'Qui', leads: 0, sales: 0 },
                { name: 'Sex', leads: 0, sales: 0 },
                { name: 'Sáb', leads: 0, sales: 0 },
                { name: 'Dom', leads: 0, sales: 0 },
            ]
        };

        return new Response(JSON.stringify(stats), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
