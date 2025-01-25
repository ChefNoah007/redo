import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","),
  hostName: process.env.SHOPIFY_APP_URL,
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
});

export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const overwrite = body.overwrite === true;

    const shopDomain = "coffee-principles.myshopify.com";
    const offlineSessionId = shopify.session.getOfflineId(shopDomain);

    const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
    if (!session) {
      throw new Error(`No offline session found for shop ${shopDomain}`);
    }

    const shopifyAPI = new shopify.clients.Rest({ session });

    let allProducts = [];
    let hasNextPage = true;
    let nextPageCursor = undefined;

    while (hasNextPage) {
      const { body, pageInfo } = await shopifyAPI.get({
        path: "products",
        query: {
          limit: 250,
          status: "active", // Nur aktive Produkte abfragen
          ...(nextPageCursor ? { page_info: nextPageCursor } : {}),
        },
      });

      allProducts = [...allProducts, ...body.products];
      nextPageCursor = pageInfo?.nextPage?.query.page_info;
      hasNextPage = Boolean(nextPageCursor);
    }

    const removeHtmlRegex = /<[^>]*>?/gm;
    const removeNewlinesRegex = /[\r\n\t]+/g;

    const normalizedItems = allProducts.map((product) => {
      const description = (product.body_html || "")
        .replace(removeHtmlRegex, "")
        .replace(removeNewlinesRegex, " ")
        .trim();

      const summary = description.split(". ").slice(0, 2).join(". ") + "."; // Erste zwei Sätze

      return {
        ProductName: product.title || "N/A",
        ProductID: product.id.toString(),
        ProductPrice: product.variants?.[0]?.price ? `${product.variants[0].price} €` : "N/A",
        ProductDescription: description,
        Summary: summary,
        ProductURL: `https://${shopDomain}/products/${product.handle || ""}`,
      };
    });

    let voiceflowUrl = "https://api.voiceflow.com/v1/knowledge-base/docs/upload/table";
    if (overwrite) {
      voiceflowUrl += "?overwrite=true";
    }

    const voiceflowData = {
      data: {
        schema: {
          searchableFields: ["ProductName", "ProductID", "ProductPrice", "ProductDescription"],
          metadataFields: ["ProductID", "ProductPrice", "ProductDescription", "ProductURL", "Summary"],
        },
        name: "ShopifyProducts",
        items: normalizedItems,
      },
    };

    const voiceflowResponse = await fetch(voiceflowUrl, {
      method: "POST",
      headers: {
        Authorization: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(voiceflowData),
    });

    if (voiceflowResponse.ok) {
      return json({ success: true });
    } else {
      const errorDetails = await voiceflowResponse.json();
      return json({ success: false, error: errorDetails });
    }
  } catch (error) {
    console.error("Synchronization error:", error);
    return json({ success: false, error: error.message });
  }
};
