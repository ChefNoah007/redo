// Importiere die register-Funktion aus der Web Pixels Extension Bibliothek
import { register } from '@shopify/web-pixels-extension';

// Registriere deinen Web Pixel
register(({ analytics }) => {
  // Abonniere das checkout_completed Event
  analytics.subscribe('checkout_completed', (event) => {
    // Extrahiere relevante Daten aus dem Event
    const checkout = event.data.checkout;
    const transactionId = checkout.order?.id;
    const total = checkout.totalPrice?.amount;
    const currency = checkout.currencyCode;
    
    // Optional: Weitere Informationen (z.B. verwendete Rabattcodes oder gelieferte Produkte) extrahieren
    // Sende die Daten an dein Tracking-Backend
    fetch('https://redo-ia4o.onrender.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        total,
        currency,
        // ggf. weitere Daten, z.B. ob der Chatbot genutzt wurde
      }),
      keepalive: true
    });
  });
});
