import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const action = async ({ request }) => {
  try {
    // Voiceflow-Einstellungen abrufen
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    // Einstellungen protokollieren (maskiert)
    console.log("Proxy action - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    // Prüfen, ob die notwendigen Einstellungen vorhanden sind
    if (!API_KEY || !PROJECT_ID) {
      console.error("Proxy action - Missing required Voiceflow settings");
      return json({ error: "Missing required Voiceflow settings" }, { status: 400 });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;
    console.log("Proxy action - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

    // timeRange-Parameter aus Query-String oder Request-Body ermitteln
    const url = new URL(request.url);
    let timeRange = url.searchParams.get("timeRange");
    if (!timeRange) {
      try {
        const body = await request.json();
        timeRange = body.timeRange;
      } catch (jsonError) {
        console.warn("Proxy action - No valid JSON body for timeRange parameter");
      }
    }
    console.log("Proxy action - Received timeRange:", timeRange);

    try {
      // Transkripte von der Voiceflow API abrufen
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
        return json({ error: `Failed to fetch transcripts: ${response.statusText}` }, { status: response.status });
      }

      const data = await response.json();
      console.log("Proxy action - API response received");

      // Überprüfen, ob die API ein gültiges Objekt liefert
      if (!data || typeof data !== "object") {
        console.error("Proxy action - API did not return valid data:", data);
        return json({ error: "Invalid response format from API" }, { status: 500 });
      }
      
      // Transkripte extrahieren (Standard: leeres Array)
      let transcripts = Array.isArray(data.transcripts) ? data.transcripts : [];
      console.log(`Proxy action - Fetched ${transcripts.length} transcripts from API`);

      // Falls ein timeRange-Parameter vorhanden ist, filtern wir die Transkripte
      if (timeRange) {
        const days = parseInt(timeRange.replace("d", ""), 10);
        if (!isNaN(days)) {
          const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          transcripts = transcripts.filter((transcript) => {
            if (transcript.createdAt) {
              return new Date(transcript.createdAt) >= thresholdDate;
            }
            return false;
          });
          console.log(`Proxy action - Filtered transcripts to last ${days} days, resulting in ${transcripts.length} transcripts`);
        } else {
          console.warn("Proxy action - Invalid timeRange format, skipping filtering");
        }
      }

      // Gruppierung der Transkripte pro Tag (angenommen, transcript.createdAt liegt im ISO-Format vor)
      const transcriptsPerDay = {};
      transcripts.forEach((transcript) => {
        if (transcript.createdAt) {
          const date = new Date(transcript.createdAt).toISOString().split("T")[0];
          transcriptsPerDay[date] = (transcriptsPerDay[date] || 0) + 1;
        }
      });

      console.log(`Proxy action - Grouped transcripts by day: ${Object.keys(transcriptsPerDay).length} days`);
      return json({ transcripts, transcriptsPerDay });
    } catch (apiError) {
      console.error("Proxy action - Error processing API request:", apiError);
      return json({ error: `API error: ${apiError.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Proxy action - Unexpected error:", error);
    return json({ error: `Unexpected error: ${error.message}` }, { status: 500 });
  }
};
