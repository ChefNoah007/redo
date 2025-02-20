import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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

// Voiceflow/Proxy keys
const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
const PROJECT_ID = "6703af9afcd0ea507e9c5369";

// Typen für Voiceflow
interface IntentData {
  name: string;
  count: number;
}

// Typen für Chat Interactions
interface DailyInteractionData {
  date: string;
  count: number;
}

// Typen für Orders (von /orders)
interface ChatOrder {
  id: number;
  created_at: string;
  total_price: string;
  // weitere Felder möglich
}

interface DailyRevenueData {
  date: string;
  revenue: number;
}

// Typ für Voiceflow/Proxy-Ergebnisse (Sessions, Intents, etc.)
interface ApiResult {
  result: Array<{
    count?: number;
    intents?: IntentData[];
    // ...
  }>;
}

// Zeitfenster (z.B. "7d", "30d", ...)
const timeRanges = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
  { label: "Last 6 Months", value: "180d" },
  { label: "Last 12 Months", value: "365d" },
];

// Hilfsfunktion: aus "7d" extrahieren wir die Zahl 7
function parseDays(timeRange: string): number {
  return parseInt(timeRange.replace("d", ""), 10);
}

function calculateTimeRange(timeRange: string): { startTime: string; endTime: string } {
  const now = new Date();
  const endTime = now.toISOString();
  const days = parseDays(timeRange);
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { startTime, endTime };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const [uniqueUsers, setUniqueUsers] = useState<number | null>(null);
  const [topIntents, setTopIntents] = useState<IntentData[] | null>(null);
  const [sessions, setSessions] = useState<number | null>(null);
  const [dailyInteractions, setDailyInteractions] = useState<DailyInteractionData[] | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");

  const [cachedData, setCachedData] = useState<Record<string, DailyInteractionData[]>>({});
  const [cachedRevenue, setCachedRevenue] = useState<Record<string, DailyRevenueData[]>>({});

  /**
   * 1) fetchDailyInteractions: Abfrage der Voiceflow Chat Interactions
   *    Hier wird der Request-Body so gesendet, dass er "resources" enthält.
   */
  const fetchDailyInteractions = async (selectedTimeRange: string) => {
    if (cachedData[selectedTimeRange]) {
      console.log(`Using cached interactions for ${selectedTimeRange}`);
      return cachedData[selectedTimeRange];
    }
    const days = parseDays(selectedTimeRange);
    const now = new Date();
    const dailyData: DailyInteractionData[] = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      try {
        const response = await fetch("https://redo-ia4o.onrender.com/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resources: [  // Wir senden jetzt "resources" statt "query"
              {
                name: "interactions",
                filter: {
                  projectID: PROJECT_ID,
                  startTime: dayStart.toISOString(),
                  endTime: dayEnd.toISOString(),
                  platform: { not: "canvas-prototype" },
                },
              },
            ],
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error: ${response.status} - ${errorText}`);
        }
        const data: ApiResult = await response.json();
        dailyData.push({
          date: dayStart.toISOString().split("T")[0],
          count: data.result[0]?.count || 0,
        });
      } catch (error) {
        console.error(`Error fetching interactions for ${dayStart.toISOString()}:`, error);
      }
    }

    const reversedData = dailyData.reverse();
    setCachedData(prev => ({ ...prev, [selectedTimeRange]: reversedData }));
    return reversedData;
  };

  /**
   * 2) fetchDailyRevenueFromOrders: Abfrage der Shopify Orders über die /orders Route
   *    Wir aggregieren den Umsatz aus Orders, die das Attribut usedChat="true" haben.
   */
  const fetchDailyRevenueFromOrders = async (selectedTimeRange: string): Promise<DailyRevenueData[]> => {
    if (cachedRevenue[selectedTimeRange]) {
      console.log(`Using cached revenue for ${selectedTimeRange}`);
      return cachedRevenue[selectedTimeRange];
    }

    const days = parseDays(selectedTimeRange);
    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const res = await fetch("/orders");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error fetching orders: ${res.status} - ${txt}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Unknown /orders error");
      }

      const chatOrders: ChatOrder[] = data.chatOrders || [];
      const filtered = chatOrders.filter((order: any) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= start && createdAt <= now;
      });

      const revenueByDay: Record<string, number> = {};
      for (const order of filtered) {
        const createdAt = new Date(order.created_at);
        const dayStr = createdAt.toISOString().split("T")[0];
        const price = parseFloat(order.total_price || "0");
        revenueByDay[dayStr] = (revenueByDay[dayStr] || 0) + price;
      }

      const dailyArray: DailyRevenueData[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split("T")[0];
        dailyArray.push({
          date: iso,
          revenue: revenueByDay[iso] || 0,
        });
      }
      dailyArray.reverse();
      setCachedRevenue(prev => ({ ...prev, [selectedTimeRange]: dailyArray }));
      return dailyArray;
    } catch (err) {
      console.error("Error fetching dailyRevenueFromOrders:", err);
      return [];
    }
  };

  /**
   * 3) fetchDashboardData: Lädt alle Dashboard-Daten (Interaktionen, Revenue, Sessions, etc.)
   */
  const fetchDashboardData = async (selectedTimeRange: string) => {
    setIsLoading(true);
    try {
      const dailyInteractionsData = await fetchDailyInteractions(selectedTimeRange);
      setDailyInteractions(dailyInteractionsData);

      const dailyRevenueData = await fetchDailyRevenueFromOrders(selectedTimeRange);
      setDailyRevenue(dailyRevenueData);

      const { startTime, endTime } = calculateTimeRange(selectedTimeRange);
      const response = await fetch("https://redo-ia4o.onrender.com/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resources: [  // Hier ebenfalls "resources" statt "query"
            {
              name: "sessions",
              filter: {
                projectID: PROJECT_ID,
                startTime,
                endTime,
                platform: { not: "canvas-prototype" },
              },
            },
            {
              name: "top_intents",
              filter: {
                projectID: PROJECT_ID,
                limit: 5,
                startTime,
                endTime,
                platform: { not: "canvas-prototype" },
              },
            },
            {
              name: "unique_users",
              filter: {
                projectID: PROJECT_ID,
                startTime,
                endTime,
                platform: { not: "canvas-prototype" },
              },
            },
          ],
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      const data: ApiResult = await response.json();

      setSessions(data.result[0]?.count || 0);
      setTopIntents(data.result[1]?.intents || []);
      setUniqueUsers(data.result[2]?.count || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(timeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Erzeuge Labels aus dailyInteractions (oder dailyRevenue)
  const dynamicLabels =
    dailyInteractions?.map((entry) => {
      const date = new Date(entry.date);
      date.setDate(date.getDate() + 1);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }) || [];

  const interactionsData = dailyInteractions?.map((entry) => entry.count) || [];
  const revenueData = dailyRevenue?.map((entry) => entry.revenue) || [];

  const lineChartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: "Interactions Over Time",
        data: interactionsData,
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
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
      legend: { position: "top" as const },
      title: { display: true, text: "Daily Interactions and Revenue" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <Page>
      <TitleBar title="Voiceflow Dashboard" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Dashboard
            </Text>
            <Select
              label="Select Time Range"
              options={timeRanges}
              onChange={(value) => setTimeRange(value)}
              value={timeRange}
            />
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h3" variant="headingMd">
              Daily Interactions and Revenue
            </Text>
            {isLoading ? (
              <Text as="p">Loading...</Text>
            ) : (
              <Line data={lineChartData} options={lineChartOptions} />
            )}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Sessions and Users
            </Text>
            <Line data={lineChartData} options={lineChartOptions} />
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Top Intents
            </Text>
            <Bar
              data={{
                labels: topIntents?.map((intent) => intent.name) || [],
                datasets: [
                  {
                    label: "Top Intents",
                    data: topIntents?.map((intent) => intent.count) || [],
                    backgroundColor: [
                      "#FF6384",
                      "#36A2EB",
                      "#FFCE56",
                      "#4BC0C0",
                      "#9966FF",
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                indexAxis: "y",
                plugins: {
                  legend: { position: "top" },
                  title: { display: true, text: "Top Intents" },
                },
                scales: { x: { beginAtZero: true } },
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
