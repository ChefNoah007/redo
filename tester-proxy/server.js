require("dotenv").config({ path: "../.env" });
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const axios = require("axios");
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { Session } = require('@shopify/shopify-api');
const { restResources } = require("@shopify/shopify-api/rest/admin/2024-01");
const { NodeAdapter } = require('@shopify/shopify-api/adapters/node');
const { PrismaSessionStorage } = require("@shopify/shopify-app-session-storage-prisma");
const prisma = require('../app/db.server.cjs');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
const VOICEFLOW_API_USAGE_URL = "https://analytics-api.voiceflow.com/v1/query/usage";
const VOICEFLOW_API_TRANSCRIPTS_URL = "https://api.voiceflow.com/v2/transcripts";
const PROJECT_ID = "6703af9afcd0ea507e9c5369";

// Shopify API-Konfiguration
if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET || !process.env.SHOPIFY_APP_URL || !process.env.SCOPES) {
  throw new Error('Missing required environment variables. Check your .env file.');
}

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.SHOPIFY_APP_URL,
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma, {
    sessionTableName: 'session',
    prismaClient: prisma,
  }),
  customAdapterFn: NodeAdapter
});

// Proxy for the usage API
app.post("/proxy", async (req, res) => {
  try {
    const response = await fetch(VOICEFLOW_API_USAGE_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Proxy for fetching all transcripts for a project
app.get("/transcripts", async (req, res) => {
  try {
    const response = await fetch("https://api.voiceflow.com/v2/transcripts/6703af9afcd0ea507e9c5369", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Proxy for fetching a specific transcript by transcriptID
app.get("/transcripts/:transcriptID", async (req, res) => {
  const { transcriptID } = req.params; // Extract transcriptID from request params
  console.log("Received transcriptID:", transcriptID); // Log the ID

  try {
    const apiURL = `${VOICEFLOW_API_TRANSCRIPTS_URL}/${PROJECT_ID}/${transcriptID}`;
    console.log("Fetching transcript details from:", apiURL); // Log the API URL

    const response = await fetch(apiURL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voiceflow API error:", errorText);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});
// Beispiel: server.js
app.post("/api/synchronize", async (req, res) => {
  try {
    const shopDomain = "quickstart-e5f7c1c4.myshopify.com";
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
          ...(nextPageCursor ? { page_info: nextPageCursor } : {}),
        },
      });

      allProducts = [...allProducts, ...body.products];
      nextPageCursor = pageInfo?.nextPage?.query.page_info;
      hasNextPage = Boolean(nextPageCursor);
    }

    // Wandeln wir Produktdaten so um, dass Voiceflow sie mag
    const normalizedItems = allProducts.map((product) => {
      // Falls null -> leere Zeichenkette
      let desc = product.body_html || "";
      // Optional: HTML entfernen oder konvertieren, wenn Voiceflow kein HTML mag:
      // desc = desc.replace(/<[^>]*>?/gm, '');

      // "ProductID" als String
      const productID = product.id.toString();

      return {
        ProductID: productID,
        ProductName: product.title || "",
        ProductPrice: product.variants?.[0]?.price ?? "N/A",
        ProductDescription: desc,
      };
    });

    // Voiceflow will: data -> name, products -> {searchableFields, metadataFields, items}
    // Wir machen "ProductName" durchsuchbar, "ProductID", "ProductPrice", "ProductDescription" als Metadaten
    const voiceflowData = {
      data: {
        schema: {
          searchableFields: ["ProductName"], // <-- nur Felder, die IMMER safe string/number/boolean
          metadataFields: ["ProductID", "ProductPrice", "ProductDescription"]
        },
        name: "ShopifyProducts",
        },
    };
    // Jetzt Request an Voiceflow
    const voiceflowResponse = await axios.post(
      "https://api.voiceflow.com/v1/knowledge-base/docs/upload/table",
      voiceflowData,
      {
        headers: {
          Authorization: `${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (voiceflowResponse.status === 200) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "Failed to upload data to Voiceflow." });
    }
  } catch (error) {
    console.error("Synchronization error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});




// Server starten
app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
});