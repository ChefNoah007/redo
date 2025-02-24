// app/routes/proxy.js

import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  const PROJECT_ID = "6703af9afcd0ea507e9c5369"; // Ersetze dies durch deine tatsächliche Projekt-ID
  const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/${PROJECT_ID}`;

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
      throw new Error(errorText);
    }

    const transcripts = await response.json();

    // Gruppierung der Transcripts pro Tag (angenommen, jedes Transcript enthält ein "createdAt"-Feld im ISO-Format)
    const transcriptsPerDay = {};

    transcripts.forEach((transcript) => {
      if (transcript.createdAt) {
        // Extrahiere das Datum (YYYY-MM-DD) aus dem Timestamp
        const date = new Date(transcript.createdAt).toISOString().split("T")[0];
        transcriptsPerDay[date] = (transcriptsPerDay[date] || 0) + 1;
      }
    });

    return json({ transcripts, transcriptsPerDay });
  } catch (error) {
    console.error("Proxy error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};
