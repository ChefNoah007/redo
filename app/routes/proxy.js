import { json } from "@remix-run/node";

// POST /proxy
export const action = async ({ request }) => {
  const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  const VOICEFLOW_API_USAGE_URL = "https://analytics-api.voiceflow.com/v1/query/usage";

  try {
    const body = await request.json();

    const response = await fetch(VOICEFLOW_API_USAGE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    return json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};