import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","),
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  apiVersion: process.env.SHOPIFY_API_VERSION || LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
});

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");

    if (!shopDomain) {
      console.error("❌ Fehler: Shop-Domain fehlt in der Anfrage!");
      return json({ success: false, error: "Missing shop parameter in request" }, { status: 400 });
    }

    console.log(`🔍 Verarbeite Anfrage für Shop: ${shopDomain}`);

    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    let session = await shopify.config.sessionStorage.loadSession(offlineSessionId);

    if (!session) {
      console.error(`❌ Keine gültige Offline-Session gefunden für ${shopDomain}`);
      return json({ success: false, error: `No offline session found for shop ${shopDomain}` }, { status: 401 });
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

    console.log(`📊 Bestellungen: ${allOrders.length}, Chat-Orders: ${chatOrders.length}`);

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
