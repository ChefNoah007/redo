import { json } from "@remix-run/node";

/**
 * API endpoint to fetch Voiceflow settings
 * This will be used by the frontend JavaScript to get the Voiceflow credentials
 * This is a public endpoint that doesn't require authentication
 */
export async function loader() {
  try {
    // Default Voiceflow settings
    // These are the same default settings defined in app/utils/voiceflow-settings.server.js
    const settings = {
      vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
      vf_project_id: "6703af9afcd0ea507e9c5369",
      vf_version_id: "6703af9afcd0ea507e9c536a"
    };

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