import { json } from '@remix-run/node';

export async function action({ request }) {
  if (request.method !== 'POST') {
    throw new Response("Method Not Allowed", { status: 405 });
  }
  
  const { settings } = await request.json();

  // Hier fügst du später deine Logik ein, um die Einstellungen zu speichern,
  // z. B. via Shopify Admin API oder als Metafield.
  
  return json({ success: true });
}
