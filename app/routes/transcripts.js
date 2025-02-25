import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const loader = async ({ request }) => {
  try {
    // Fetch Voiceflow settings from metafields
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    // Log settings (masked for security)
    console.log("Transcripts loader - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    // Validate settings
    if (!API_KEY || !PROJECT_ID) {
      console.error("Transcripts loader - Missing required Voiceflow settings");
      return json({ 
        dailyTranscripts: [],
        error: "Missing required Voiceflow settings" 
      });
    }

    const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;
    console.log("Transcripts loader - Fetching from URL:", VOICEFLOW_API_TRANSCRIPTS_URL);

    try {
      const url = new URL(request.url);
      const timeRangeParam = url.searchParams.get("timeRange") || "7d";
      const days = parseInt(timeRangeParam.replace("d", "")) || 7; // Default to 7 if parsing fails
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      console.log(`Transcripts loader - Filtering for last ${days} days (since ${startDate.toISOString()})`);

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
          dailyTranscripts: [],
          error: `Failed to fetch transcripts: ${response.statusText}` 
        });
      }

      const data = await response.json();
      console.log("Transcripts loader - API response received");
      
      // Wenn transcripts nicht vorhanden ist, benutze ein leeres Array
      const transcripts = data.transcripts || [];
      console.log(`Transcripts loader - Processing ${transcripts.length} transcripts`);

      const transcriptsByDate = {};
      transcripts.forEach((transcript) => {
        const transcriptDate = new Date(transcript.timestamp);
        if (transcriptDate >= startDate) {
          const dateKey = transcriptDate.toISOString().split("T")[0];
          if (!transcriptsByDate[dateKey]) {
            transcriptsByDate[dateKey] = 0;
          }
          transcriptsByDate[dateKey]++;
        }
      });

      const dailyTranscripts = Object.keys(transcriptsByDate).map((date) => ({
        date,
        count: transcriptsByDate[date],
      }));

      // Sort by date (newest first)
      dailyTranscripts.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`Transcripts loader - Returning ${dailyTranscripts.length} daily transcript entries`);
      return json({ dailyTranscripts });
    } catch (apiError) {
      console.error("Transcripts loader - Error processing API request:", apiError);
      return json({ 
        dailyTranscripts: [],
        error: `API error: ${apiError.message}` 
      });
    }
  } catch (error) {
    console.error("Transcripts loader - Unexpected error:", error);
    // Return empty array with 200 status to prevent UI errors
    return json({ 
      dailyTranscripts: [],
      error: `Unexpected error: ${error.message}` 
    }, { status: 200 });
  }
};