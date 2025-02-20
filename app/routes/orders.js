import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","), 
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""), 
  apiVersion: process.env.SHOPIFY_API_VERSION,  // Korrektur: Jetzt aus .env geladen
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
});

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop"); // Extrahiere Shop-Domain aus URL

    if (!shopDomain) {
      return json({ success: false, error: "❌ Fehler: Shop-Domain fehlt in der Anfrage." }, { status: 400 });
    }

    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);

    if (!session) {
      return json({ 
        success: false, 
        error: `❌ Fehler: Keine gültige Offline-Session für ${shopDomain} gefunden.` 
      }, { status: 401 });
    }

    const client = new shopify.clients.Rest({ session });

    const getResponse = await client.get({
      path: "orders",
      query: {
        status: "any",
      },
    });

    const allOrders = getResponse.body?.orders || [];

    const chatOrders = allOrders.filter((order) => {
      if (!order.note_attributes) return false;
      return order.note_attributes.some(
        (attr) => attr.name === "usedChat" && attr.value === "true"
      );
    });

    return json({
      success: true,
      totalOrders: allOrders.length,
      chatOrdersCount: chatOrders.length,
      chatOrders,
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Fehler in orders loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
