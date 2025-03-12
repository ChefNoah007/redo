// app/routes/daily-data.js

import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";
import { getCachedData, setCachedData } from "../utils/redis-client.server";
import { getShopDomain } from "../utils/env-config.server";

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

    // Create a cache key based on the shop domain and time range
    const shopDomain = getShopDomain();
    const cacheKey = `orders:${shopDomain}:${timeRangeParam}`;
    
    // Try to get data from cache first
    let allOrders = await getCachedData(cacheKey);
    
    if (!allOrders) {
      console.log("Daily data - Cache miss, fetching from Shopify API");
      
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
      allOrders = getResponse.body?.orders || [];
      console.log("Fetched orders count:", allOrders.length);
      
      // Cache the orders for 1 hour (3600 seconds)
      await setCachedData(cacheKey, allOrders, 3600);
      console.log("Daily data - Cached Shopify API response");
    } else {
      console.log("Daily data - Cache hit, using cached orders data");
    }

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

    // Aggregiere Umsatz und Kaufanzahl pro Datum für Chat-Bestellungen
    const revenueByDate = {};
    const purchaseCountByDate = {};
    chatOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split("T")[0];
      const price = parseFloat(order.total_price || "0");
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + price;
      purchaseCountByDate[dateKey] = (purchaseCountByDate[dateKey] || 0) + 1;
      console.log(
        `Order ${order.id} für Datum ${dateKey} gezählt: price=${price}`
      );
    });
    console.log("Aggregated revenue by date:", revenueByDate);
    console.log("Aggregated purchase counts by date:", purchaseCountByDate);

    // Neue Aggregation: Alle Bestellungen pro Datum
    const allOrdersCountByDate = {};
    allOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split("T")[0];
      allOrdersCountByDate[dateKey] = (allOrdersCountByDate[dateKey] || 0) + 1;
    });
    console.log("Aggregated all orders count by date:", allOrdersCountByDate);

    // Erstelle für jeden Tag im Zeitraum einen Eintrag (mit 0, falls keine Daten)
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const dateKey = d.toISOString().split("T")[0];
      dailyData.push({
        date: dateKey,
        purchases: purchaseCountByDate[dateKey] || 0,
        revenue: revenueByDate[dateKey] || 0,
        allOrders: allOrdersCountByDate[dateKey] || 0,
      });
    }
    console.log("Final daily data:", dailyData);

    return json({ 
      dailyData,
      chatOrders: chatOrders.map(order => ({
        id: order.id,
        created_at: order.created_at,
        total_price: order.total_price,
        order_number: order.order_number,
        userID: order.note_attributes?.find(attr => attr.name === "VF_UserID")?.value || null
      }))
    }, { status: 200 });
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
