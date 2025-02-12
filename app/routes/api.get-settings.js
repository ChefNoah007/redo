// app/routes/api.get-settings.jsx
import { json } from '@remix-run/node';

const shop = process.env.SHOPIFY_SHOP_DOMAIN;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

export async function loader({ request }) {
  // Rufe das Metafield über die Shopify Admin API ab.
  const response = await fetch(`https://${shop}/admin/api/2025-01/metafields.json?namespace=ai_agents_einstellungen&key=global`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    }
  });

  const result = await response.json();

  if (!response.ok) {
    return json({ success: false, error: result }, { status: 500 });
  }

  // Je nach API-Antwort musst du den Wert des Metafields extrahieren.
  // Im Beispiel nehmen wir an, dass result.metafields ein Array ist und wir das erste Element nutzen:
  const metafield = result.metafields && result.metafields[0];
  let settings = null;
  if (metafield && metafield.value) {
    try {
      settings = JSON.parse(metafield.value);
    } catch (err) {
      settings = null;
    }
  }
  
  // Wenn kein Metafield vorhanden ist, kannst du Standardwerte zurückgeben.
  if (!settings) {
    settings = {
      hide_on_desktop: false,
      hide_on_mobile: false,
      page_slug: 'none',
      bot_background_colour: '#FFFFFF',
      bot_text_colour: '#1A1E23',
      user_background_colour: '#FECF02',
      user_text_colour: '#FFFAE5',
      chat_heading: 'KI-Beratung',
      send_label: 'Abschicken',
      type_here_label: 'Tippe hier dein Anliegen ein ...',
      outer_radius: 0,
      chat_bubble_radius: 0,
      input_button_radius: 0
    };
  }

  return json({ success: true, settings });
}
