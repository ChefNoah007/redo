export const action = async ({ request }) => {
    try {
      // Lies die Anfrage-Daten
      const requestData = await request.json();
      
      // Proxy-Logik: Weiterleiten an die externe API
      const proxyResponse = await fetch("https://example.com/external-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_API_KEY",
        },
        body: JSON.stringify(requestData),
      });
  
      // Beantworte die Anfrage mit der Antwort der externen API
      const responseData = await proxyResponse.json();
      return new Response(JSON.stringify(responseData), {
        status: proxyResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Proxy-Fehler:", error);
      return new Response(JSON.stringify({ error: "Proxy-Fehler!" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };