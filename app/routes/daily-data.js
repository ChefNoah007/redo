// app/routes/daily-data.js

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
    // Hier ggf. dynamisch ermitteln (z. B. aus der Session)
    const shopDomain = "coffee-principles.myshopify.com";

    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      return json(
        { success: false, error: `No offline session found for shop ${shopDomain}` },
        { status: 401 }
      );
    }

    const client = new shopify.clients.Rest({ session });

    const getResponse = await client.get({
      path: "orders",
      query: {
        status: "any",
      },
    });
    const allOrders = getResponse.body?.orders || [];

    // Filtern: Nur Bestellungen, bei denen note_attributes usedChat = true enthalten
    const chatOrders = allOrders.filter((order) => {
      if (!order.note_attributes) return false;
      return order.note_attributes.some(
        (attr) => attr.name === "usedChat" && attr.value === "true"
      );
    });

    // Aggregiere die tägliche Revenue: Gruppiere nach Erstellungsdatum und summiere den total_price
    const revenueByDate = {};

    chatOrders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0];
      const price = parseFloat(order.total_price || "0");
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      revenueByDate[date] += price;
    });

    // Erstelle ein Array von Objekten im Format { date, revenue }
    const dailyRevenue = Object.keys(revenueByDate)
      .map((date) => ({
        date,
        revenue: revenueByDate[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return json(
      {
        dailyRevenue,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
