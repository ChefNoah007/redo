import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { getCachedData, setCachedData } from "../utils/redis-client.server";

export const action = async ({ request }) => {
  try {
    // Retrieve Voiceflow settings
    const settings = await getVoiceflowSettings(request);
    const API_KEY = settings.vf_key;
    const PROJECT_ID = settings.vf_project_id;
    
    console.log("Intents API - Using Voiceflow settings:", { 
      API_KEY: API_KEY ? "Present (masked)" : "Missing", 
      PROJECT_ID: PROJECT_ID || "Missing" 
    });

    if (!API_KEY || !PROJECT_ID) {
      console.error("Intents API - Missing required Voiceflow settings");
      return json({ error: "Missing required Voiceflow settings" }, { status: 400 });
    }

    const VOICEFLOW_ANALYTICS_API_URL = "https://analytics-api.voiceflow.com/v1/query/usage";
    console.log("Intents API - Fetching from URL:", VOICEFLOW_ANALYTICS_API_URL);

    // Get timeRange parameter from query or body
    const url = new URL(request.url);
    let timeRange = url.searchParams.get("timeRange");
    if (!timeRange) {
      try {
        const body = await request.json();
        timeRange = body.timeRange;
      } catch (jsonError) {
        console.warn("Intents API - No valid JSON body for timeRange parameter");
        timeRange = "7d"; // Default to 7 days if not specified
      }
    }
    console.log("Intents API - Received timeRange:", timeRange);

    // Calculate start and end times based on timeRange
    const now = new Date();
    const endTime = now.toISOString();
    const days = parseInt(timeRange.replace("d", ""), 10) || 7;
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    
    console.log("Intents API - Time range:", { startTime, endTime, days });

    // Construct the query for the Analytics API
    const queryPayload = {
      query: [
        {
          name: "top_intents",
          filter: {
            projectID: PROJECT_ID,
            startTime: startTime,
            endTime: endTime,
            limit: 5 // Limit to top 5 intents
          }
        }
      ]
    };

    try {
      // Create a cache key based on the project ID, time range, and query parameters
      const cacheKey = `intents:${PROJECT_ID}:${timeRange}:${startTime}:${endTime}`;
      
      // Try to get data from cache first
      let intents = await getCachedData(`${cacheKey}`);
      
      if (!intents) {
        console.log("Intents API - Cache miss, fetching from API");
        
        const response = await fetch(VOICEFLOW_ANALYTICS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": API_KEY
          },
          body: JSON.stringify(queryPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Intents API - API request failed: ${response.status} ${response.statusText}`, errorText);
          return json({ error: `Failed to fetch intents: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        console.log("Intents API - API response received:", data);

        // Extract intents from the response
        intents = [];
        if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
          const intentResult = data.result[0];
          if (intentResult && Array.isArray(intentResult.intents)) {
            intents = intentResult.intents;
            console.log(`Intents API - Extracted ${intents.length} intents from API response`);
            
            // Cache the intents for 1 hour (3600 seconds)
            await setCachedData(cacheKey, intents, 3600);
            console.log("Intents API - Cached API response");
          } else {
            console.warn("Intents API - No intents found in API response");
          }
        } else {
          console.warn("Intents API - Unexpected API response format");
        }
      } else {
        console.log("Intents API - Cache hit, using cached data");
      }

      return json({ intents });
    } catch (apiError) {
      console.error("Intents API - Error processing API request:", apiError);
      return json({ error: `API error: ${apiError.message}`, intents: [] }, { status: 500 });
    }
  } catch (error) {
    console.error("Intents API - Unexpected error:", error);
    return json({ error: `Unexpected error: ${error.message}`, intents: [] }, { status: 500 });
  }
};
