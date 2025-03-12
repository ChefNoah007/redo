import { json } from "@remix-run/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server.cjs";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
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

export const action = async ({ request }) => {
  // Voiceflow-Settings aus den Metafeldern abrufen
  const settings = await getVoiceflowSettings(request);
  try {
    const body = await request.json();
    const overwrite = body.overwrite === true;

    const shopDomain = getShopDomain();
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
          status: "active", // Nur aktive Produkte
          ...(nextPageCursor ? { page_info: nextPageCursor } : {}),
        },
      });

      allProducts = [...allProducts, ...body.products];
      nextPageCursor = pageInfo?.nextPage?.query.page_info;
      hasNextPage = Boolean(nextPageCursor);
    }

    const normalizedItems = allProducts.map((product) => {
      const removeHtmlRegex = /<[^>]*>?/gm;
      const removeNewlinesRegex = /[\r\n\t]+/g;

      let desc = product.body_html || "";
      desc = desc.replace(removeHtmlRegex, "").replace(removeNewlinesRegex, " ").trim();

      let name = product.title || "";
      name = name.replace(removeNewlinesRegex, " ").trim();

      const productUrl = product.online_store_url || `https://${shopDomain}/products/${product.handle}`;

      // Varianten mit Lagerbestand mappen
      const variants = product.variants.map((variant) => ({
        title: variant.title || "Default",
        price: variant.price ? parseFloat(variant.price) : null,
        inventory_quantity: variant.inventory_quantity
      }));

      const images = product.images.map((img) => img.src);
      const tags = product.tags ? product.tags.split(",").map((tag) => tag.trim()) : [];

      // Überprüfen, ob mindestens eine Variante einen positiven Lagerbestand hat
      const isAvailable = product.variants.some(
        (variant) => variant.inventory_quantity > 0
      );
      const availabilityText = isAvailable ? "Dieses Produkt ist Verfügbar und kann erworben werden." : "Dieses Produkt ist Ausverkauft und kann derzeit nicht gekauft werden!";

      // Statischer Custom-Tag "Produkte"
      const customTag = "Produkte";

      return {
        ProductID: product.id.toString(),
        ProductName: name,
        ProductPrice: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : null,
        ProductDescription: desc,
        ProductURL: productUrl,
        ProductVariants: variants,             // Komplexer Typ, nur in metadataFields
        ProductTags: tags,                     // Komplexer Typ, nur in metadataFields
        ProductTagsStr: tags.join(", "),       // Einfacher String für die Suche
        ProductImages: images,                 // Komplexer Typ, nur in metadataFields
        CustomTag: customTag,                  // Statischer Custom-Tag "Produkte"
        Availability: availabilityText         // Neu: "verfügbar" oder "Ausverkauft!" basierend auf inventory_quantity
      };
    });

    // Voiceflow URL mit optionalem overwrite-Parameter
    let voiceflowUrl = "https://api.voiceflow.com/v1/knowledge-base/docs/upload/table";
    if (overwrite) {
      voiceflowUrl += "?overwrite=true";
    }

    const voiceflowData = {
      data: {
        schema: {
          searchableFields: [
            "ProductName",
            "ProductDescription",
            "ProductTagsStr",
            "CustomTag",
            "Availability"
          ],
          metadataFields: [
            "ProductID",
            "ProductName",
            "ProductPrice",
            "ProductDescription",
            "ProductURL",
            "ProductVariants",
            "ProductTags",
            "ProductImages",
            "CustomTag",
            "Availability" // Neues Feld für die Verfügbarkeitsanzeige
          ],
        },
        name: "ShopifyProdukte",
        items: normalizedItems,
      },
    };

    const voiceflowResponse = await fetch(voiceflowUrl, {
      method: "POST",
      headers: {
        Authorization: settings.vf_key,
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
