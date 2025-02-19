// app/server/dailyData.server.js
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
  createdAt: { type: Date, default: Date.now },
});

const Tracking =
  mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);

export async function getDailyData() {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const results = await Tracking.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: today } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        dailyRevenue: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    dailyInteractions: results.map((item) => ({
      date: item._id,
      count: item.count,
    })),
    dailyRevenue: results.map((item) => ({
      date: item._id,
      revenue: item.dailyRevenue,
    })),
  };
}
