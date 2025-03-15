import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // Voiceflow-Settings aus den Metafeldern abrufen
  const settings = await getVoiceflowSettings(request);
  try {
    const body = await request.json();
    const overwrite = body.overwrite === true;

    // Authenticate with Shopify and get the admin API client
    const authResult = await authenticate.admin(request);
    if (!authResult) {
      throw new Error("Authentication failed");
    }
    
    // Get the admin API client
    const admin = authResult.admin;
    if (!admin) {
      throw new Error("Admin API client not available");
    }

    // Get the session from the auth result
    const { session } = authResult;
    if (!session) {
      throw new Error("No session found in auth result");
    }

    // Get the shop domain from the session
    const shopDomain = session.shop;
    if (!shopDomain) {
      throw new Error("No shop found in session");
    }

    // Use GraphQL to fetch products
    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        query GetProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            edges {
              cursor
              node {
                id
                title
                handle
                description
                descriptionHtml
                onlineStoreUrl
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      inventoryQuantity
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      src
                    }
                  }
                }
                tags
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `;

      const response = await admin.graphql(query, {
        variables: {
          cursor: cursor,
        },
      });

      const responseJson = await response.json();
      
      if (!responseJson.data || !responseJson.data.products) {
        throw new Error("Invalid GraphQL response structure");
      }

      const products = responseJson.data.products.edges.map(edge => {
        const product = edge.node;
        return {
          id: product.id.split('/').pop(),
          title: product.title,
          handle: product.handle,
          body_html: product.descriptionHtml,
          online_store_url: product.onlineStoreUrl,
          variants: product.variants.edges.map(variantEdge => ({
            title: variantEdge.node.title,
            price: variantEdge.node.price,
            inventory_quantity: variantEdge.node.inventoryQuantity
          })),
          images: product.images.edges.map(imageEdge => ({
            src: imageEdge.node.src
          })),
          tags: product.tags
        };
      });

      allProducts = [...allProducts, ...products];
      hasNextPage = responseJson.data.products.pageInfo.hasNextPage;
      
      if (hasNextPage && responseJson.data.products.edges.length > 0) {
        cursor = responseJson.data.products.edges[responseJson.data.products.edges.length - 1].cursor;
      } else {
        hasNextPage = false;
      }
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
      // Handle tags as an array (from GraphQL) or as a string (from REST API)
      const tags = product.tags 
        ? (Array.isArray(product.tags) 
            ? product.tags 
            : product.tags.split(",").map((tag) => tag.trim())) 
        : [];

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
