import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Spinner,
  List,
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

const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
const PROJECT_ID = "6703af9afcd0ea507e9c5369";

interface IntentData {
  name: string;
  count: number;
}

interface DailyInteractionData {
  date: string;
  count: number; // Für Interaktionen
}

interface DailyRevenueData {
  date: string;
  revenue: number;
}

interface ApiResult {
  result: Array<{
    count?: number;
    intents?: IntentData[];
    dailyInteractions?: DailyInteractionData[];
    dailyRevenue?: DailyRevenueData[];
    averageSessionDuration?: number;
    messagesExchanged?: number;
    errorRate?: number;
    newUsers?: number;
  }>;
}

const timeRanges = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
  { label: "Last 6 Months", value: "180d" },
  { label: "Last 12 Months", value: "365d" },
];

const calculateTimeRange = (timeRange: string): { startTime: string; endTime: string } => {
  const now = new Date();
  const endTime = now.toISOString();
  const startTime = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString();
  return { startTime, endTime };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const fetcher = useFetcher();
  const [uniqueUsers, setUniqueUsers] = useState<number | null>(null);
  const [topIntents, setTopIntents] = useState<IntentData[] | null>(null);
  const [sessions, setSessions] = useState<number | null>(null);
  const [dailyInteractions, setDailyInteractions] = useState<DailyInteractionData[] | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [cachedData, setCachedData] = useState<Record<string, DailyInteractionData[]>>({}); // Cache für dailyInteractions
  const [cachedRevenue, setCachedRevenue] = useState<Record<string, DailyRevenueData[]>>({}); // Cache für dailyRevenue

  const fetchDailyInteractions = async (selectedTimeRange: string) => {
    if (cachedData[selectedTimeRange]) {
      console.log(`Using cached interactions for ${selectedTimeRange}`);
      return cachedData[selectedTimeRange];
    }

    const days = parseInt(selectedTimeRange.replace("d", ""));
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
            query: [
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
        const localDate = new Date(dayStart);
        dailyData.push({
          date: localDate.toISOString().split("T")[0],
          count: data.result[0]?.count || 0,
        });
      } catch (error) {
        console.error(`Error fetching interactions for ${dayStart.toISOString()}:`, error);
      }
    }

    const reversedData = dailyData.reverse();
    setCachedData((prev) => ({ ...prev, [selectedTimeRange]: reversedData }));
    return reversedData;
  };

  const fetchDailyRevenue = async (selectedTimeRange: string) => {
    if (cachedRevenue[selectedTimeRange]) {
      console.log(`Using cached revenue data for ${selectedTimeRange}`);
      return cachedRevenue[selectedTimeRange];
    }

    const days = parseInt(selectedTimeRange.replace("d", ""));
    const now = new Date();
    const revenueData: DailyRevenueData[] = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      try {
        const response = await fetch("https://redo-ia4o.onrender.com/api.daily-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: [
              {
                name: "revenue",
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
        const localDate = new Date(dayStart);
        revenueData.push({
          date: localDate.toISOString().split("T")[0],
          revenue: data.result[0]?.count || 0, // Hier gehen wir davon aus, dass "count" den Umsatz repräsentiert.
        });
      } catch (error) {
        console.error(`Error fetching revenue for ${dayStart.toISOString()}:`, error);
      }
    }

    const reversedData = revenueData.reverse();
    setCachedRevenue((prev) => ({ ...prev, [selectedTimeRange]: reversedData }));
    return reversedData;
  };

  const fetchDashboardData = async (selectedTimeRange: string) => {
    setIsLoading(true);
    try {
      const dailyInteractionsData = await fetchDailyInteractions(selectedTimeRange);
      setDailyInteractions(dailyInteractionsData);

      const dailyRevenueData = await fetchDailyRevenue(selectedTimeRange);
      setDailyRevenue(dailyRevenueData);

      const { startTime, endTime } = calculateTimeRange(selectedTimeRange);
      const response = await fetch("https://redo-ia4o.onrender.com/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: [
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
  }, [timeRange]);

  const dynamicLabels =
    dailyInteractions?.map((entry) => {
      const date = new Date(entry.date);
      date.setDate(date.getDate() + 1); // Verschiebe das Datum um einen Tag nach vorne
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
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Daily Interactions and Revenue",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const usersAndSessionsChartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: "Unique Users Over Time",
        data: dailyInteractions?.map((entry) => entry.count), // Beispiel: ersetze durch echte Daten
        borderColor: "#FF6384",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.4,
      },
      {
        label: "Sessions Over Time",
        data: dailyInteractions?.map((entry) => entry.count), // Beispiel: ersetze durch echte Daten
        borderColor: "#36A2EB",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
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
  };

  const barChartOptions = {
    responsive: true,
    indexAxis: "y",
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Top Intents",
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  } as const;

  return (
    <Page>
      <TitleBar title="Voiceflow Dashboard" />
      <Layout>
        {/* Zeitbereichsauswahl */}
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

        {/* Interactions und Umsatz */}
        <Layout.Section>
          <Card>
            <Text as="h3" variant="headingMd">
              Daily Interactions and Revenue
            </Text>
            {isLoading ? (
              <Text as={"h5"}>Loading...</Text>
            ) : (
              <Line data={lineChartData} options={lineChartOptions} />
            )}
          </Card>
        </Layout.Section>

        {/* Sessions and Users vs. Top Intents */}
        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Sessions and Users
            </Text>
            <Line data={usersAndSessionsChartData} options={lineChartOptions} />
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Top Intents
            </Text>
            <Bar data={barChartData} options={barChartOptions} />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
