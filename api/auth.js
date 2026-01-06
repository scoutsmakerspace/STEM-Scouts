export async function onRequest(context) {
  return new Response(
    JSON.stringify({ error: "OAuth endpoint not active yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}
