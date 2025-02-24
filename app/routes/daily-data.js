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
    const url = new URL(request.url);
    const timeRangeParam = url.searchParams.get("timeRange") || "7d";
    const days = parseInt(timeRangeParam.replace("d", ""));
    console.log("Requested time range (days):", days);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    console.log("Calculated start date:", startDate.toISOString());

    const shopDomain = "coffee-principles.myshopify.com";
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      console.log(`No offline session found for shop ${shopDomain}`);
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
    console.log("Fetched orders count:", allOrders.length);

    // Filtere Bestellungen: Nur Orders mit note_attributes usedChat = "true" und erstellt nach startDate
    const chatOrders = allOrders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const hasUsedChat =
        order.note_attributes &&
        order.note_attributes.some(
          (attr) =>
            attr.name === "usedChat" &&
            attr.value === "true"
        );
      return hasUsedChat && orderDate >= startDate;
    });
    console.log("Filtered chat orders count:", chatOrders.length);

    // Aggregiere Anzahl der Käufe und Umsätze pro Datum
    const purchaseDataByDate = {};
    chatOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split("T")[0];
      if (!purchaseDataByDate[dateKey]) {
        purchaseDataByDate[dateKey] = { purchases: 0, revenue: 0 };
      }
      purchaseDataByDate[dateKey].purchases++;
      purchaseDataByDate[dateKey].revenue += parseFloat(order.total_price);
      console.log(`Order ${order.id} für Datum ${dateKey} gezählt`);
    });
    console.log("Aggregierte Kaufzahlen und Umsätze pro Datum:", purchaseDataByDate);

    // Erstelle für jeden Tag im Zeitraum einen Eintrag, 0 falls keine Bestellung
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const dateKey = d.toISOString().split("T")[0];
      dailyData.push({
        date: dateKey,
        purchases: purchaseDataByDate[dateKey]?.purchases || 0,
        revenue: purchaseDataByDate[dateKey]?.revenue || 0,
      });
    }
    console.log("Final daily data:", dailyData);

    return json({ dailyData }, { status: 200 });
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
