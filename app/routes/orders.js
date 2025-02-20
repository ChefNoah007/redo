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
    // 1️⃣ Shop-Domain aus der Anfrage extrahieren
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");

    if (!shopDomain) {
      console.error("❌ Fehler: Shop-Domain fehlt in der Anfrage.");
      return json({ success: false, error: "Missing shop parameter in request" }, { status: 400 });
    }

    console.log(`🔍 Verarbeite Anfrage für Shop: ${shopDomain}`);

    // 2️⃣ Offline Session abrufen
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    let session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    
    console.log("🛠 Geladene Session:", session);

    // 3️⃣ Falls keine Session existiert, neue Session speichern (Workaround)
    if (!session) {
      console.warn(`⚠️ Keine gültige Session gefunden für ${shopDomain}, erstelle neue...`);
      
      session = new shopify.session.CustomSession(offlineSessionId);
      await shopify.config.sessionStorage.storeSession(session);
      
      console.log("✅ Neue Offline-Session gespeichert:", session);
    }

    // 4️⃣ Shopify REST-Client erstellen
    const client = new shopify.clients.Rest({ session });

    // 5️⃣ Bestellungen abrufen
    const getResponse = await client.get({
      path: "orders",
      query: {
        status: "any",
      },
    });

    const allOrders = getResponse.body?.orders || [];

    // 6️⃣ Filtern nach `note_attributes.usedChat == "true"`
    const chatOrders = allOrders.filter((order) => {
      if (!order.note_attributes) return false;
      return order.note_attributes.some(
        (attr) => attr.name === "usedChat" && attr.value === "true"
      );
    });

    console.log(`📊 Gefundene Bestellungen: ${allOrders.length}, Davon Chat-Orders: ${chatOrders.length}`);

    // 7️⃣ Antwort senden
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
