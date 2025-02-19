// tracking.js

import { register } from '@shopify/web-pixels-extension';

register(({ analytics }) => {
  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event.data.checkout;
    const transactionId = checkout.order?.id;
    const total = checkout.totalPrice?.amount;
    const currency = checkout.currencyCode;

    // Prüfen, ob das Cookie "chatInteracted=true" enthalten ist
    let chatInteracted = false;
    if (typeof document !== "undefined") {
      // Simpler Check: Enthält der document.cookie-String "chatInteracted=true"?
      chatInteracted = document.cookie.includes("chatInteracted=true");
    }

    fetch('https://redo-ia4o.onrender.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        total,
        currency,
        chatInteracted, // <-- hier senden wir ein zusätzliches Feld
      }),
      keepalive: true
    });
  });
});
