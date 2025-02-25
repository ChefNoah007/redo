import { json } from "@remix-run/node";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

export const loader = async ({ params, request }) => {
  const { transcriptID } = params;
  
  // Fetch Voiceflow settings from metafields
  const settings = await getVoiceflowSettings(request);
  const API_KEY = settings.vf_key;
  const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${settings.vf_project_id}/${transcriptID}`;

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
      throw new Error(errorText);
    }

    const data = await response.json();
    return json(data);
  } catch (error) {
    console.error(`Error fetching transcript ${transcriptID}:`, error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};