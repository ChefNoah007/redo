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
  usedChat: Boolean, // geändert
  createdAt: { type: Date, default: Date.now },
});

export async function action({ request }) {
  try {
    const data = await request.json();
    console.log("Tracking-Daten empfangen:", data);

    const trackingEvent = new Tracking({
      transaction_id: data.transaction_id,
      total: data.total,
      currency: data.currency,
      usedChat: data.usedChat,  // geändert
    });

    await trackingEvent.save();
    return json({ message: "Tracking-Daten empfangen" });
  } catch (error) {
    console.error("Error saving tracking data:", error);
    return json({ message: "Internal Server Error" }, { status: 500 });
  }
}