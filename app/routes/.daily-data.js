// app/routes/daily-data.js
import mongoose from "mongoose";
import { json } from "@remix-run/node";

// DB-Verbindung vorbereiten
if (!mongoose.connection.readyState) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const Tracking = mongoose.models.Tracking || mongoose.model("Tracking", new mongoose.Schema({
  transaction_id: String,
  total: Number,
  currency: String,
  usedChat: Boolean,
  createdAt: { type: Date, default: Date.now },
}));

export async function loader() {
  try {
    // Beispiel: Letzte 7 Tage abrufen
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Aggregation
    const results = await Tracking.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: today },
          usedChat: true, // falls du nur Chat-Bestellungen tracken willst
        },
      },
      {
        $project: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: 1,
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // In ein Array packen (schrittweise pro Tag)
    const dailyRevenue = [];
    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dayString = d.toISOString().split("T")[0];
      const match = results.find(r => r._id === dayString);
      dailyRevenue.push({
        date: dayString,
        revenue: match ? match.revenue : 0,
      });
    }

    return json({ dailyRevenue }, 200);
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return json({ error: error.message }, 500);
  }
}
