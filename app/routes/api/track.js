// app/routes/api/track.server.js
import { json } from "@remix-run/node";
import mongoose from "mongoose";

// Stelle sicher, dass du die MongoDB-Verbindung nur einmal aufbaust.
if (!mongoose.connection.readyState) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

// Definiere das Schema für Tracking-Daten
const trackingSchema = new mongoose.Schema({
  transaction_id: String,
  total: Number,
  currency: String,
  createdAt: { type: Date, default: Date.now },
});

// Vermeide Mehrfach-Definitionen, indem du prüfst, ob das Model bereits existiert.
const Tracking = mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);

// Exportiere ausschließlich serverseitige Funktionen (kein Default Export!)
// Remix behandelt diese Route dann als API-Route, die nur auf dem Server läuft.
export async function action({ request }) {
  try {
    const data = await request.json();
    console.log("Tracking-Daten empfangen:", data);
    const trackingEvent = new Tracking(data);
    await trackingEvent.save();
    return json({ message: "Tracking-Daten empfangen" });
  } catch (error) {
    console.error("Error saving tracking data:", error);
    return json({ message: "Internal Server Error" }, { status: 500 });
  }
}
