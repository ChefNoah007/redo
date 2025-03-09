import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { getCachedData, setCachedData } from "../utils/redis-client.server";

export const action = async ({ request }) => {
  try {
    // Voiceflow-Einstellungen abrufen
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    console.log("Proxy action - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    if (!API_KEY || !PROJECT_ID) {
      console.error("Proxy action - Missing required Voiceflow settings");
      return json({ error: "Missing required Voiceflow settings" }, { status: 400 });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;
    console.log("Proxy action - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

    // timeRange-Parameter aus Query oder Body ermitteln
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
      // Create a cache key based on the project ID and time range
      const cacheKey = `transcripts:${PROJECT_ID}:${timeRange || 'all'}`;
      
      // Try to get data from cache first
      let transcripts = await getCachedData(cacheKey);
      
      // If not in cache, fetch from API
      if (!transcripts) {
        console.log("Proxy action - Cache miss, fetching from API");
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

        // Hier: Falls data direkt ein Array ist, verwenden wir es.
        transcripts = Array.isArray(data) ? data : [];
        console.log(`Proxy action - Fetched ${transcripts.length} transcripts from API`);
        
        // Cache the API response for 1 hour (3600 seconds)
        await setCachedData(cacheKey, transcripts, 3600);
        console.log("Proxy action - Cached API response");
      } else {
        console.log("Proxy action - Cache hit, using cached data");
      }

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

      // Gruppierung der Transkripte pro Tag anhand des Feldes createdAt
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
