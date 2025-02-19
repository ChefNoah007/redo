// daily-data.js
import mongoose from "mongoose";
import { json } from "@remix-run/node";

if (!mongoose.connection.readyState) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const Tracking = mongoose.models.Tracking; // Das Model hast du schon in track.js definiert

export async function loader() {
  try {
    // Hole z. B. die letzten 7 Tage
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Aggregation in Mongo: pro Tag summieren wir `total`, filtern nur `chatInteracted = true`
    // (wenn du ALLE Bestellungen möchtest, dann chatInteracted rausnehmen!)
    const results = await Tracking.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: today },
          chatInteracted: true,
        },
      },
      {
        $project: {
          // Protokolliere Tag (YYYY-MM-DD) aus createdAt
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: 1,
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$total" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // results ist jetzt eine Liste von { _id: "2025-02-14", revenue: 999.99 }, etc.

    // In ein Array transformieren, damit es so aussieht wie dein Frontend es erwartet:
    const dailyRevenue = [];
    // Wir gehen jeden Tag (von sevenDaysAgo bis heute) durch
    // und schauen, ob ein Eintrag existiert
    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dayString = d.toISOString().split("T")[0];
      const match = results.find((r) => r._id === dayString);
      dailyRevenue.push({
        date: dayString,
        revenue: match ? match.revenue : 0,
      });
    }

    // Hier könntest du ggf. noch dailyInteractions berechnen
    // (z.B. wie oft "chatInteracted=true" pro Tag vorkam) oder separate Aggregation

    return new Response(JSON.stringify({ dailyRevenue }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in daily-data loader:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
