// track.js
import { json } from "@remix-run/node";
import mongoose from "mongoose";

if (!mongoose.connection.readyState) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const trackingSchema = new mongoose.Schema({
  transaction_id: String,
  total: Number,
  currency: String,
  chatInteracted: Boolean, // <-- neues Feld
  createdAt: { type: Date, default: Date.now },
});

// Prüfen, ob Model schon existiert:
const Tracking = mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);

// Serverseitige Funktion 
export async function action({ request }) {
  try {
    const data = await request.json();
    console.log("Tracking-Daten empfangen:", data);

    // Speichere die übergebenen Felder in Mongo
    const trackingEvent = new Tracking({
      transaction_id: data.transaction_id,
      total: data.total,
      currency: data.currency,
      chatInteracted: data.chatInteracted,  // <-- hier übernehmen
    });

    await trackingEvent.save();
    return json({ message: "Tracking-Daten empfangen" });
  } catch (error) {
    console.error("Error saving tracking data:", error);
    return json({ message: "Internal Server Error" }, { status: 500 });
  }
}
