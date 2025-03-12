import { json } from "@remix-run/node";

/**
 * Public API endpoint to fetch Voiceflow settings
 * This will be used by the frontend JavaScript in the shop to get the Voiceflow credentials
 * 
 * IMPORTANT: This endpoint does NOT use authentication to allow access from the shop frontend
 */
export async function loader({ request }) {
  // Set CORS headers to allow access from any origin
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60" // Cache for 1 minute
  };

  try {
    // Hardcoded default settings - in a real implementation, you would fetch these from the database
    // These are the same default settings as in utils/voiceflow-settings.server.js
    const settings = {
      vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
      vf_project_id: "6703af9afcd0ea507e9c5369",
      vf_version_id: "6703af9afcd0ea507e9c536a"
    };
    
    // Return the settings as JSON with appropriate headers
    return json(settings, { headers });
  } catch (error) {
    console.error("Error in public Voiceflow settings endpoint:", error);
    return json(
      { error: "Failed to fetch Voiceflow settings" },
      { status: 500, headers }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  
  return json({ error: "Method not allowed" }, { status: 405 });
}
