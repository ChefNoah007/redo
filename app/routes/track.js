import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

// In-Memory-Speicher für Tracking-Daten (nur als Beispiel)
let trackingData = [];

// POST-Endpunkt, um Tracking-Daten zu empfangen
app.post('/track', (req, res) => {
  const data = req.body;
  console.log('Tracking-Daten empfangen:', data);
  trackingData.push(data);
  res.status(200).json({ message: 'Tracking-Daten empfangen' });
});
