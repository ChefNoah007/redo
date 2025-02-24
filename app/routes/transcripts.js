import { json } from "@remix-run/node";

export const loader = async () => {
  const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  const VOICEFLOW_API_TRANSCRIPTS_URL = "https://api.voiceflow.com/v2/transcripts/6703af9afcd0ea507e9c5369";

  try {
    const response = await fetch(VOICEFLOW_API_TRANSCRIPTS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    const transcriptsByDate = {};

    data.transcripts.forEach((transcript) => {
      const dateKey = new Date(transcript.timestamp).toISOString().split("T")[0];
      if (!transcriptsByDate[dateKey]) {
        transcriptsByDate[dateKey] = 0;
      }
      transcriptsByDate[dateKey]++;
    });

    const dailyTranscripts = Object.keys(transcriptsByDate).map((date) => ({
      date,
      count: transcriptsByDate[date],
    }));

    return json({ dailyTranscripts });
  } catch (error) {
    console.error("Proxy error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};