import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const loader = async ({ request }) => {
  try {
    // Voiceflow-Einstellungen abrufen
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    // Einstellungen (maskiert) protokollieren
    console.log("Transcripts loader - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    // Validierung der Einstellungen
    if (!API_KEY || !PROJECT_ID) {
      console.error("Transcripts loader - Missing required Voiceflow settings");
      return json({ 
        transcripts: [],
        error: "Missing required Voiceflow settings" 
      });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;
    console.log("Transcripts loader - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

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
        console.error(`Transcripts loader - API request failed: ${response.status} ${response.statusText}`, errorText);
        return json({ 
          transcripts: [],
          error: `Failed to fetch transcripts: ${response.statusText}` 
        });
      }

      const data = await response.json();
      console.log("Transcripts loader - API response received");

      // Sicherstellen, dass ein Array zurückgegeben wird
      const transcripts = Array.isArray(data) ? data : [];
      console.log(`Transcripts loader - Returning ${transcripts.length} transcripts`);
      
      return json({ transcripts });
    } catch (apiError) {
      console.error("Transcripts loader - Error processing API request:", apiError);
      return json({ 
        transcripts: [],
        error: `API error: ${apiError.message}` 
      });
    }
  } catch (error) {
    console.error("Transcripts loader - Unexpected error:", error);
    // Bei Fehlern ein leeres Array zurückgeben, um UI-Fehler zu vermeiden
    return json({ 
      transcripts: [],
      error: `Unexpected error: ${error.message}` 
    }, { status: 200 });
  }
};
