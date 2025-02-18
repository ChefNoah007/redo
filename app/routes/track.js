import express from 'express';
import bodyParser from 'body-parser';

const app = express();

// Verwende express.json() könnte auch genutzt werden, body-parser bleibt hier zur Demonstration
app.use(bodyParser.json());

// In-Memory-Speicher für Tracking-Daten (nur als Beispiel)
let trackingData = [];

// Endpunkt, um einzelne Tracking-Daten zu empfangen
app.post('/track', (req, res) => {
  const data = req.body;
  console.log('Tracking-Daten empfangen:', data);
  // Speichere die empfangenen Daten (hier: in einem Array)
  trackingData.push(data);
  res.status(200).json({ message: 'Tracking-Daten empfangen' });
});

// Aggregierter Endpunkt für tägliche Daten (Dummy-Beispiel)
// In der Praxis würdest du hier in einer Datenbank gespeicherte Daten aggregieren
app.get('/api/daily-data', (req, res) => {
  const today = new Date();
  let dailyInteractions = [];
  let dailyRevenue = [];
  
  // Beispiel: Erzeuge Dummy-Daten für die letzten 7 Tage
  for (let i = 6; i >= 0; i--) {
    let date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    dailyInteractions.push({ date: dateString, count: Math.floor(Math.random() * 100) + 50 });
    dailyRevenue.push({ date: dateString, revenue: Math.floor(Math.random() * 1000) + 200 });
  }
  
  res.json({ dailyInteractions, dailyRevenue });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
