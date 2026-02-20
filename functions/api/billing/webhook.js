export async function onRequestPost(context) {
    const { request, env } = context;

    // In real implementation: Verify Stripe Signature here.

    try {
        const event = await request.json();
        console.log('[Billing Webhook] Received event:', event.type);

        // Handle Subscription Updated/Deleted
        if (event.type === 'subscription_updated') {
            const { userEmail, status } = event.data;

            // Update User Status
            await env.DB.prepare('UPDATE users SET subscription_status = ? WHERE email = ?')
                .bind(status, userEmail) // active, past_due, canceled
                .run();

            console.log(`[Billing] Updated ${userEmail} to ${status}`);
        }

        return new Response('Webhook Received', { status: 200 });

    } catch (e) {
        return new Response(`Webhook Error: ${e.message}`, { status: 400 });
    }
}
