import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  const VOICEFLOW_API_TRANSCRIPTS_URL = "https://api.voiceflow.com/v2/transcripts/6703af9afcd0ea507e9c5369";

  try {
    const url = new URL(request.url);
    const timeRangeParam = url.searchParams.get("timeRange") || "7d";
    const days = parseInt(timeRangeParam.replace("d", ""));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

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
    if (!data.transcripts) {
      throw new Error("Transcripts data is missing");
    }

    const transcriptsByDate = {};

    data.transcripts.forEach((transcript) => {
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

    return json({ dailyTranscripts });
  } catch (error) {
    console.error("Proxy error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};