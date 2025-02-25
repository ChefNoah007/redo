/**
 * Helper function to fetch Voiceflow settings from Shopify metafields
 * This function is used by various routes that need to access the Voiceflow API
 */

import { authenticate } from "../shopify.server";

// Default values in case the metafields don't exist or can't be fetched
const DEFAULT_SETTINGS = {
  vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
  vf_project_id: "6703af9afcd0ea507e9c5369",
  vf_version_id: "6703af9afcd0ea507e9c536a"
};

/**
 * Fetches Voiceflow settings from Shopify metafields
 * @param {Request} request - The request object from the loader/action
 * @returns {Promise<Object>} - The Voiceflow settings
 */
export async function getVoiceflowSettings(request) {
  try {
    // Check if request is valid
    if (!request) {
      console.error("getVoiceflowSettings: No request object provided");
      return DEFAULT_SETTINGS;
    }

    try {
      // Check if the request is authenticated
      let admin;
      try {
        // Authenticate with Shopify admin API
        const authResult = await authenticate.admin(request);
        admin = authResult.admin;
        
        if (!admin) {
          console.error("getVoiceflowSettings: Authentication successful but admin object is missing");
          return DEFAULT_SETTINGS;
        }
      } catch (authError) {
        // If authentication fails, log the error and return default settings
        console.error("getVoiceflowSettings: Authentication failed:", authError);
        return DEFAULT_SETTINGS;
      }

      // Fetch the Voiceflow settings from metafields
      try {
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
        
        // Check if the response has the expected structure
        if (!responseJson.data || !responseJson.data.shop) {
          console.error("getVoiceflowSettings: Invalid GraphQL response structure", responseJson);
          return DEFAULT_SETTINGS;
        }

        const metafield = responseJson.data.shop.metafield;
        
        // If the metafield exists, parse the JSON value
        if (metafield) {
          try {
            const settings = JSON.parse(metafield.value);
            console.log("getVoiceflowSettings: Successfully retrieved settings from metafield");
            return {
              vf_key: settings.vf_key || DEFAULT_SETTINGS.vf_key,
              vf_project_id: settings.vf_project_id || DEFAULT_SETTINGS.vf_project_id,
              vf_version_id: settings.vf_version_id || DEFAULT_SETTINGS.vf_version_id
            };
          } catch (parseError) {
            console.error("getVoiceflowSettings: Error parsing metafield value:", parseError);
          }
        } else {
          console.log("getVoiceflowSettings: No metafield found, using default settings");
        }
      } catch (graphqlError) {
        console.error("getVoiceflowSettings: GraphQL query failed:", graphqlError);
      }

      // Return default settings if metafield doesn't exist or can't be parsed
      return DEFAULT_SETTINGS;
    } catch (authError) {
      console.error("getVoiceflowSettings: Authentication error:", authError);
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("getVoiceflowSettings: Unexpected error:", error);
    return DEFAULT_SETTINGS;
  }
}