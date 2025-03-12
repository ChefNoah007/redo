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

export async function loader({ request }) {
  try {
    const shopDomain = getShopDomain();
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);
    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      return json(
        { success: false, error: `No offline session found for shop ${shopDomain}` },
        { status: 500 }
      );
    }
    
    const client = new shopify.clients.Rest({ session });
    
    // Metafield abrufen
    const response = await client.get({
      path: "metafields",
      query: {
        namespace: "ai_agents_einstellungen",
        key: "global"
      }
    });
    
    const metafields = response.body.metafields;
    let settings = null;
    if (metafields && metafields.length > 0) {
      const metafield = metafields[0];
      try {
        settings = JSON.parse(metafield.value);
      } catch (error) {
        settings = null;
      }
    }
    
    // Falls keine Einstellungen vorhanden sind, erstellen wir das Metafield mit Standardwerten
    if (!settings) {
      settings = {
        hide_on_desktop: false,
        hide_on_mobile: false,
        bot_background_colour: "#FFFFFF",
        bot_text_colour: "#1A1E23",
        user_background_colour: "#FECF02",
        user_text_colour: "#FFFAE5",
        chat_heading: "KI-Beratung",
        send_label: "Abschicken",
        type_here_label: "Tippe hier dein Anliegen ein ...",
        outer_radius: 0,
        chat_bubble_radius: 0,
        input_button_radius: 0,
        chat_container_width: "980px",
        chat_container_padding: 20,
        chat_container_margin: 20,
        container_box_shadow: "0px 0px 200px rgba(0, 0, 0, 0.2)",
        font_family: "Assistant, sans-serif",
        font_size: 16,
        // Integration-Einstellungen
        judge_api_token: ""
      };

      await client.post({
        path: "metafields",
        data: {
          metafield: {
            namespace: "ai_agents_einstellungen",
            key: "global",
            value: JSON.stringify(settings),
            type: "json_string"
          }
        },
        type: "application/json"
      });
    }
    
    return json({ success: true, settings });
  } catch (error) {
    console.error("Error in get-settings loader:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
