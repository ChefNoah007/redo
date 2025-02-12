// app/routes/api.save-settings.jsx
import { json } from '@remix-run/node';

const shop = process.env.SHOPIFY_SHOP_DOMAIN;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const apiVersion = "2025-01"; // Passe dies an die gewünschte Version an

export async function action({ request }) {
  if (request.method !== 'POST') {
    throw new Response("Method Not Allowed", { status: 405 });
  }

  const { settings } = await request.json();
  const value = JSON.stringify(settings);

  // Zuerst: Prüfe, ob bereits ein Metafield vorhanden ist
  const getResponse = await fetch(`https://${shop}/admin/api/${apiVersion}/metafields.json?namespace=ai_agents_einstellungen&key=global`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    }
  });
  const getResult = await getResponse.json();

  let metafieldId = null;
  if (getResult.metafields && getResult.metafields.length > 0) {
    metafieldId = getResult.metafields[0].id;
  }

  let updateResponse;
  if (metafieldId) {
    // Metafield existiert – aktualisiere es mit PUT
    updateResponse = await fetch(`https://${shop}/admin/api/${apiVersion}/metafields/${metafieldId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        metafield: {
          id: metafieldId,
          value: value,
          type: "json_string" // oder den entsprechenden Typ, je nach deiner Definition
        }
      })
    });
  } else {
    // Metafield existiert nicht – erstelle es per POST
    updateResponse = await fetch(`https://${shop}/admin/api/${apiVersion}/metafields.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        metafield: {
          namespace: "ai_agents_einstellungen",
          key: "global",
          value: value,
          type: "json_string" // Passe den Typ an, falls erforderlich
        }
      })
    });
  }

  const updateResult = await updateResponse.json();

  if (updateResponse.ok) {
    return json({ success: true, data: updateResult });
  } else {
    return json({ success: false, error: updateResult }, { status: 500 });
  }
}
