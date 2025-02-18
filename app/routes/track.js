const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware, um JSON-Daten aus dem Request-Body zu parsen
app.use(bodyParser.json());

app.post('/track', (req, res) => {
  // Die empfangenen Tracking-Daten aus dem Body
  const trackingData = req.body;
  console.log('Tracking-Daten empfangen:', trackingData);

  // Hier kannst du die Daten weiterverarbeiten,
  // zum Beispiel in einer Datenbank speichern oder an einen anderen Service senden

  // Sende eine Bestätigung zurück
  res.status(200).json({ message: 'Tracking-Daten empfangen' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
