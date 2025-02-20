import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  BarElement,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { authenticate } from "../shopify.server";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Zeitraum-Optionen
const timeRanges = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
  { label: "Last 6 Months", value: "180d" },
  { label: "Last 12 Months", value: "365d" },
];

const parseDays = (timeRange: string): number => parseInt(timeRange.replace("d", ""), 10);

const calculateTimeRange = (timeRange: string): { startTime: string; endTime: string } => {
  const now = new Date();
  const endTime = now.toISOString();
  const days = parseDays(timeRange);
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { startTime, endTime };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const fetcher = useFetcher();
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");

  /**
   * 1) Holt Bestellungen von `/orders` & berechnet den Umsatz
   */
  const fetchDailyRevenue = async (selectedTimeRange: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/orders");
      if (!response.ok) throw new Error(`Error fetching orders: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Unknown /orders error");

      // Bestellungen filtern nach Zeitraum
      const days = parseDays(selectedTimeRange);
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const chatOrders = data.chatOrders || [];

      const revenueByDay: Record<string, number> = {};
      for (const order of chatOrders) {
        const createdAt = new Date(order.created_at);
        if (createdAt >= start && createdAt <= now) {
          const dayStr = createdAt.toISOString().split("T")[0];
          const price = parseFloat(order.total_price || "0");
          revenueByDay[dayStr] = (revenueByDay[dayStr] || 0) + price;
        }
      }

      // Erzeuge tägliche Umsatzdaten
      const dailyArray = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split("T")[0];

        return { date: iso, revenue: revenueByDay[iso] || 0 };
      }).reverse();

      setDailyRevenue(dailyArray);
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyRevenue(timeRange);
  }, [timeRange]);

  // Chart-Labels & Daten
  const labels = dailyRevenue.map((entry) => entry.date);
  const revenueData = dailyRevenue.map((entry) => entry.revenue);

  const lineChartData = {
    labels,
    datasets: [
      {
        label: "Revenue (in €)",
        data: revenueData,
        borderColor: "#FF6384",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Daily Revenue from Chat Orders" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <Page>
      <TitleBar title="Chat Revenue Dashboard" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2">Dashboard</Text>
            <Select
              label="Select Time Range"
              options={timeRanges}
              onChange={setTimeRange}
              value={timeRange}
            />
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h3">Revenue from Chat Orders</Text>
            {isLoading ? <Text>Loading...</Text> : <Line data={lineChartData} options={lineChartOptions} />}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
