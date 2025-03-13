register(({ analytics }) => {
    analytics.subscribe("checkout_completed", (event) => {
        console.log("Checkout Order Data:", event.data.checkout.order);

      const checkout = event.data.checkout;
      const transactionId = checkout.order?.id;
      const total = checkout.totalPrice?.amount;
      const currency = checkout.currencyCode;
  
      // Vorher hast du hier das Cookie geprüft:
      // let usedChat = document.cookie.includes("chatInteracted=true");
  
      // NEU: Statt Cookie -> Cart-Attribut (noteAttributes)
      let usedChat = false;
      const noteAttributes = checkout.order?.noteAttributes || [];
      // noteAttributes ist ein Array [{ name: "usedChat", value: "true" }, ...]
  
      for (const attr of noteAttributes) {
        if (attr.name === "usedChat" && attr.value === "true") {
          usedChat = true;
        }
      }
  
      // Dann deinen Tracking-Call an dein Backend
      fetch("https://ai-agent-iuss.onrender.com/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          total,
          currency,
          usedChat,
        }),
        keepalive: true,
      });
    });
  });
  