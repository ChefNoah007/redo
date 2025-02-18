// app/routes/api/daily-data.server.js
import { json } from "@remix-run/node";
import mongoose from "mongoose";

// Baue die Verbindung zu MongoDB nur einmal auf
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

// Vermeide Mehrfach-Definitionen
const Tracking =
  mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);

// Exportiere ausschließlich den Loader – **kein Default Export!**
export async function loader() {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const results = await Tracking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyInteractions = results.map((item) => ({
      date: item._id,
      count: item.count,
    }));
    const dailyRevenue = results.map((item) => ({
      date: item._id,
      revenue: item.dailyRevenue,
    }));

    return json({ dailyInteractions, dailyRevenue });
  } catch (error) {
    console.error("Error aggregating daily data:", error);
    return json({ message: "Unexpected Server Error" }, { status: 500 });
  }
}
