// app/routes/proxy.js

import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const action = async ({ request }) => {
  try {
    // Fetch Voiceflow settings from metafields
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    // Log settings (masked for security)
    console.log("Proxy action - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    // Validate settings
    if (!API_KEY || !PROJECT_ID) {
      console.error("Proxy action - Missing required Voiceflow settings");
      return json({ 
        error: "Missing required Voiceflow settings" 
      }, { status: 400 });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;
    console.log("Proxy action - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

    try {
      // Die Fetch Project Transcripts API wird per GET aufgerufen.
      const response = await fetch(VOICEFLOW_API_TRANSCRIPTS_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy action - API request failed: ${response.status} ${response.statusText}`, errorText);
        return json({ 
          error: `Failed to fetch transcripts: ${response.statusText}` 
        }, { status: response.status });
      }

      const data = await response.json();
      console.log("Proxy action - API response received");
      
      // Ensure data is valid
      if (!data || typeof data !== 'object') {
        console.error("Proxy action - API did not return valid data:", data);
        return json({ 
          error: "Invalid response format from API" 
        }, { status: 500 });
      }
      
      // Extract transcripts array, default to empty if not present
      const transcripts = Array.isArray(data.transcripts) ? data.transcripts : [];
      console.log(`Proxy action - Processing ${transcripts.length} transcripts`);

      // Gruppierung der Transcripts pro Tag (angenommen, jedes Transcript enthält ein "createdAt"-Feld im ISO-Format)
      const transcriptsPerDay = {};

      transcripts.forEach((transcript) => {
        if (transcript.createdAt) {
          // Extrahiere das Datum (YYYY-MM-DD) aus dem Timestamp
          const date = new Date(transcript.createdAt).toISOString().split("T")[0];
          transcriptsPerDay[date] = (transcriptsPerDay[date] || 0) + 1;
        }
      });

      console.log(`Proxy action - Grouped transcripts by day: ${Object.keys(transcriptsPerDay).length} days`);
      return json({ transcripts, transcriptsPerDay });
    } catch (apiError) {
      console.error("Proxy action - Error processing API request:", apiError);
      return json({ 
        error: `API error: ${apiError.message}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Proxy action - Unexpected error:", error);
    return json({ 
      error: `Unexpected error: ${error.message}` 
    }, { status: 500 });
  }
};
