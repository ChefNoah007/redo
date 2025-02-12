import type { NextApiRequest, NextApiResponse } from 'next';

// Hier würdest du normalerweise die Shopify Admin API aufrufen, um das Metafield abzurufen.
// Für den Anfang geben wir einen Beispiel-Datensatz zurück.

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    success: true,
    settings: {
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
      input_button_radius: 0,
    }
  });
}
