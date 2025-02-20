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
    // Lese den Zeitbereich aus der Query, Standard: "7d"
    const url = new URL(request.url);
    const timeRangeParam = url.searchParams.get("timeRange") || "7d";
    const days = parseInt(timeRangeParam.replace("d", ""));
    
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Shop-Domain (hier ggf. dynamisch ermitteln)
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

    // Filtere Bestellungen: Nur Orders mit note_attributes usedChat = "true" und erstellt nach startDate
    const chatOrders = allOrders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return order.note_attributes &&
        order.note_attributes.some(
          (attr) => attr.name === "usedChat" && attr.value === "true"
        ) &&
        orderDate >= startDate;
    });

    // Aggregiere Umsatz pro Datum
    const revenueByDate = {};
    chatOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split("T")[0];
      const price = parseFloat(order.total_price || "0");
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = 0;
      }
      revenueByDate[dateKey] += price;
    });

    // Erstelle für jeden Tag im Zeitraum einen Eintrag (mit 0, falls keine Daten)
    const dailyRevenue = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0];
      dailyRevenue.push({
        date: dateKey,
        revenue: revenueByDate[dateKey] || 0,
      });
    }

    return json({ dailyRevenue }, { status: 200 });
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
