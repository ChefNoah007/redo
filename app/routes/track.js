import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

const app = express();
app.use(bodyParser.json());

// Mit der MongoDB verbinden
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definiere ein Schema für Tracking-Daten
const trackingSchema = new mongoose.Schema({
  transaction_id: String,
  total: Number,
  currency: String,
  createdAt: { type: Date, default: Date.now },
});

const Tracking = mongoose.model('Tracking', trackingSchema);

// POST-Endpunkt zum Speichern der Tracking-Daten
app.post('/track', async (req, res) => {
  try {
    const data = req.body;
    console.log('Tracking-Daten empfangen:', data);
    const trackingEvent = new Tracking(data);
    await trackingEvent.save();
    res.status(200).json({ message: 'Tracking-Daten empfangen' });
  } catch (error) {
    console.error('Error saving tracking data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
