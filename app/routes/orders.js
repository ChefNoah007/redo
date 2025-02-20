// app/routes/orders.js
import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","), 
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""), 
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
});

export async function loader({ request }) {
  try {
    // 1) Hier ggf. dynamisch ermitteln: 
    //    z.B. aus session, anstatt hart "coffee-principles.myshopify.com"
    const shopDomain = "coffee-principles.myshopify.com";

    // 2) Offline Session
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      return json({ 
        success: false, 
        error: `No offline session found for shop ${shopDomain}` 
      }, { status: 401 });
    }

    // 3) Shop-Client
    const client = new shopify.clients.Rest({ session });

    // 4) Orders abrufen
    const getResponse = await client.get({
      path: "orders",
      query: {
        status: "any",
        // limit: 250, // etc.
      },
    });
    // getResponse.body => { orders: [...] }
    const allOrders = getResponse.body?.orders || [];

    // 5) Filtern: Nur Orders mit note_attribute (usedChat = true)
    const chatOrders = allOrders.filter((order) => {
      if (!order.note_attributes) return false;
      return order.note_attributes.some(
        (attr) => attr.name === "usedChat" && attr.value === "true"
      );
    });

    // 6) Rückgabe
    return json({
      success: true,
      totalOrders: allOrders.length,
      chatOrdersCount: chatOrders.length,
      chatOrders,
    }, { status: 200 });

  } catch (error) {
    console.error("Error in orders loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
