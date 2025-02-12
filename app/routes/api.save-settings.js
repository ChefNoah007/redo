import { NextApiRequest, NextApiResponse } from 'next';

// In einer echten Implementierung würdest du hier die Daten an Shopify senden,
// um das Metafield (oder die einzelnen Metafields) zu aktualisieren.
// Dieser Beispielcode simuliert nur eine erfolgreiche Speicherung.

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { settings } = req.body;
    // Hier solltest du die Shopify Admin API aufrufen, um das Metafield zu aktualisieren.
    // Zum Beispiel mit einem Shopify SDK oder per HTTP-Request.
    // Für dieses Beispiel gehen wir von einem erfolgreichen Speichern aus.
    res.status(200).json({ success: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
