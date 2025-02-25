import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

/**
 * API endpoint to fetch Voiceflow settings
 * This will be used by the frontend JavaScript to get the Voiceflow credentials
 */
export async function loader({ request }) {
  // For public access, we don't need to authenticate the request
  // But we do need to authenticate to access the admin API
  const { admin } = await authenticate.admin(request);

  try {
    // Fetch the Voiceflow settings from metafields
    const response = await admin.graphql(
      `query {
        shop {
          metafield(namespace: "voiceflow_settings", key: "api_credentials") {
            value
          }
        }
      }`
    );

    const responseJson = await response.json();
    const metafield = responseJson.data.shop.metafield;
    
    // Default settings if no metafield exists
    let settings = {
      vf_key: "",
      vf_project_id: "",
      vf_version_id: ""
    };

    if (metafield) {
      try {
        settings = JSON.parse(metafield.value);
      } catch (e) {
        console.error("Error parsing metafield value:", e);
      }
    }

    // Return the settings as JSON with appropriate cache headers
    return json(settings, {
      headers: {
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error fetching Voiceflow settings:", error);
    return json(
      { error: "Failed to fetch Voiceflow settings" },
      { status: 500 }
    );
  }
}