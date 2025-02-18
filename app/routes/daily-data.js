// daily-data.js
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

// GET-Endpunkt, der aggregierte Dummy-Daten für die letzten 7 Tage liefert
app.get('/daily-data', (req, res) => {
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
