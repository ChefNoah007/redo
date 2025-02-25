import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const loader = async ({ params, request }) => {
  try {
    const { transcriptID } = params;
    console.log(`Transcript detail loader - Fetching transcript ID: ${transcriptID}`);
    
    // Fetch Voiceflow settings from metafields
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    // Log settings (masked for security)
    console.log("Transcript detail loader - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    // Validate settings
    if (!API_KEY || !PROJECT_ID) {
      console.error("Transcript detail loader - Missing required Voiceflow settings");
      return json({ 
        error: "Missing required Voiceflow settings" 
      }, { status: 400 });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}/${transcriptID}`;
    console.log("Transcript detail loader - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

    try {
      const response = await fetch(VOICEFLOW_API_TRANSCRIPTS_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Transcript detail loader - API request failed: ${response.status} ${response.statusText}`, errorText);
        return json({ 
          error: `Failed to fetch transcript: ${response.statusText}` 
        }, { status: response.status });
      }

      const data = await response.json();
      console.log("Transcript detail loader - API response received");
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error("Transcript detail loader - API did not return an array:", data);
        return json({ 
          error: "Invalid response format from API" 
        }, { status: 500 });
      }
      
      return json(data);
    } catch (apiError) {
      console.error(`Transcript detail loader - Error fetching from API:`, apiError);
      return json({ 
        error: `API error: ${apiError.message}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Transcript detail loader - Unexpected error:`, error);
    return json({ 
      error: `Unexpected error: ${error.message}` 
    }, { status: 500 });
  }
};