export async function onRequest(context) {
    const { results } = await context.env.DB.prepare(
        "SELECT * FROM config"
    ).all();

    const config = results.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});

    return new Response(JSON.stringify(config), {
        headers: { "content-type": "application/json" }
    });
}
