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
    console.log("Requested time range (days):", days);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    console.log("Calculated start date:", startDate.toISOString());

    // Shop-Domain (hier ggf. dynamisch ermitteln)
    const shopDomain = "coffee-principles.myshopify.com";

    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      console.log(`No offline session found for shop ${shopDomain}`);
      return json(
        { success: false, error: `No offline session found for shop ${shopDomain}` },
        { status: 401 }
      );
    }

    const client = new shopify.clients.Rest({ session });

    // Abrufen aller Bestellungen
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
      if (hasUsedChat) {
        console.log(
          `Order ${order.id}: created_at=${order.created_at}, total_price=${order.total_price}`
        );
      }
      return hasUsedChat && orderDate >= startDate;
    });
    console.log("Filtered chat orders count:", chatOrders.length);

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
      console.log(
        `Aggregating order ${order.id} for date ${dateKey}: price=${price}`
      );
    });
    console.log("Aggregated revenue by date:", revenueByDate);

    // Erstelle für jeden Tag im Zeitraum (exakt "days" Einträge) einen Eintrag (mit 0, falls keine Daten)
    const dailyRevenue = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      dailyRevenue.push({
        date: dateKey,
        revenue: revenueByDate[dateKey] || 0,
      });
    }
    console.log("Final daily revenue data:", dailyRevenue);

    return json({ dailyRevenue }, { status: 200 });
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
