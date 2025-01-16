import { json } from "@remix-run/node";

export const loader = async ({ params }) => {
  const { transcriptID } = params;
  const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  const VOICEFLOW_API_TRANSCRIPTS_URL = `https://api.voiceflow.com/v2/transcripts/6703af9afcd0ea507e9c5369/${transcriptID}`;

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