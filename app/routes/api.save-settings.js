// app/routes/api.save-settings.jsx
import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";
import { getShopDomain } from "../utils/env-config.server";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","),
  hostName: process.env.SHOPIFY_APP_URL,
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
});

export async function action({ request }) {
  if (request.method !== "POST") {
    throw new Response("Method Not Allowed", { status: 405 });
  }
  
  try {
    const { settings } = await request.json();
    const value = JSON.stringify(settings);
  
    const shopDomain = getShopDomain();
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      return json({ success: false, error: `No session found for shop ${shopDomain}` }, { status: 500 });
    }
  
    const client = new shopify.clients.Rest({ session });
  
    // Prüfe, ob das Metafield bereits existiert
    const getResponse = await client.get({
      path: "metafields",
      query: {
        namespace: "ai_agents_einstellungen",
        key: "global"
      }
    });
    console.log("GET Metafield Response:", getResponse.body);
    let metafieldId = null;
    if (getResponse.body.metafields && getResponse.body.metafields.length > 0) {
      metafieldId = getResponse.body.metafields[0].id;
    }
  
    let updateResponse;
    if (metafieldId) {
      // Aktualisiere das vorhandene Metafield per PUT
      updateResponse = await client.put({
        path: `metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: value,
            type: "json_string"
          }
        },
        type: "application/json"
      });
    } else {
      // Erstelle ein neues Metafield per POST
      updateResponse = await client.post({
        path: "metafields",
        data: {
          metafield: {
            namespace: "ai_agents_einstellungen",
            key: "global",
            value: value,
            type: "json_string"
          }
        },
        type: "application/json"
      });
    }
  
    console.log("Update Response Body:", updateResponse.body);
    
    if (updateResponse.body && updateResponse.body.metafield) {
      return json({ success: true, data: updateResponse.body });
    } else {
      return json({ success: false, error: updateResponse.body }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in save-settings action:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
