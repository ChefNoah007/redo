// app/routes/api/daily-data.js
import { json } from "@remix-run/node";
import { getDailyData } from "~/server/dailyData.server.js";

export async function loader() {
  const data = await getDailyData();
  return json(data);
}
