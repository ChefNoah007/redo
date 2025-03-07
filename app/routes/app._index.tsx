import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
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
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";

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

interface LoaderData {
  vf_key: string;
  vf_project_id: string;
  vf_version_id: string;
}

interface IntentData {
  name: string;
  count: number;
}

interface DailyInteractionData {
  date: string;
  count: number;
}

interface DailyRevenueData {
  date: string;
  revenue: number;
  purchases?: number;
  allOrders?: number;  // new field for all orders per day
}

interface ChatOrder {
  id: string;
  created_at: string;
  total_price: string;
  order_number: string;
  userID?: string;
}

interface Transcript {
  _id: string;
  sessionID?: string;
  createdAt?: string;
  projectID?: string;
  browser?: string;
  device?: string;
  os?: string;
  updatedAt?: string;
  name?: string;
  image?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getVoiceflowSettings(request);
  return json<LoaderData>({
    vf_key: settings.vf_key,
    vf_project_id: settings.vf_project_id,
    vf_version_id: settings.vf_version_id,
  });
};

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

export default function Index() {
  const { vf_key, vf_project_id, vf_version_id } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [uniqueUsers, setUniqueUsers] = useState<number | null>(null);
  const [topIntents, setTopIntents] = useState<IntentData[] | null>(null);
  const [sessions, setSessions] = useState<number | null>(null);
  const [dailyInteractions, setDailyInteractions] = useState<DailyInteractionData[] | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [cachedData, setCachedData] = useState<Record<string, DailyInteractionData[]>>({});
  const [cachedRevenue, setCachedRevenue] = useState<Record<string, DailyRevenueData[]>>({});
  const [chatOrders, setChatOrders] = useState<ChatOrder[]>([]);

  // 1) Transkripte pro Tag über den Proxy abrufen
  const fetchDailyTranscripts = async (selectedTimeRange: string) => {
    if (cachedData[selectedTimeRange]) {
      console.log(`Using cached transcripts for ${selectedTimeRange}`);
      return cachedData[selectedTimeRange];
    }
    const days = parseInt(selectedTimeRange.replace("d", ""));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const response = await fetch("/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange: selectedTimeRange }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      // Der Proxy liefert "transcriptsPerDay" zurück
      const transcriptsPerDay = data.transcriptsPerDay || {};
      const dailyTranscripts: DailyInteractionData[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i + 1);
        const dateKey = d.toISOString().split("T")[0];
        dailyTranscripts.push({ date: dateKey, count: transcriptsPerDay[dateKey] || 0 });
      }
      setCachedData((prev) => ({ ...prev, [selectedTimeRange]: dailyTranscripts }));
      return dailyTranscripts;
    } catch (error) {
      console.error("Error fetching daily transcripts:", error);
      return [];
    }
  };

  // 2) Revenue-Daten abrufen (angenommener Endpunkt /daily-data)
  const fetchDailyRevenue = async (selectedTimeRange: string): Promise<DailyRevenueData[]> => {
    if (cachedRevenue[selectedTimeRange]) {
      console.log(`Using cached revenue data for ${selectedTimeRange}`);
      return cachedRevenue[selectedTimeRange];
    }
    try {
      const response = await fetch(`/daily-data?timeRange=${selectedTimeRange}`, {
        method: "GET",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      const data: { dailyData: DailyRevenueData[], chatOrders?: ChatOrder[] } = await response.json();
      const revenueData = data.dailyData || [];
      setChatOrders(data.chatOrders || []);
      setCachedRevenue((prev) => ({ ...prev, [selectedTimeRange]: revenueData }));
      return revenueData;
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
      return [];
    }
  };

  // 3) Gesamtdaten (Analytics, Transcripts, Revenue) laden
  const fetchDashboardData = async (selectedTimeRange: string) => {
    setIsLoading(true);
    try {
      const dailyTranscriptsData = await fetchDailyTranscripts(selectedTimeRange);
      setDailyInteractions(dailyTranscriptsData);

      const dailyRevenueData = await fetchDailyRevenue(selectedTimeRange);
      setDailyRevenue(dailyRevenueData);

      // Analytics-Daten (hier werden die Transkripte auch für weitere Berechnungen genutzt)
      try {
        const { startTime, endTime } = calculateTimeRange(selectedTimeRange);
        console.log("Dashboard - Fetching analytics data with time range:", { startTime, endTime });
        const response = await fetch("/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeRange: selectedTimeRange }),
        });
          
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Dashboard - API request failed: ${response.status} ${response.statusText}`, errorText);
        } else {
          const data = await response.json();
          console.log("Dashboard - Analytics API response:", data);
          const transcriptCount = Array.isArray(data.transcripts) ? data.transcripts.length : 0;
          setSessions(transcriptCount);
          setTopIntents([]);
          let uniqueUserCount = 0;
          if (Array.isArray(data.transcripts)) {
            const uniqueUsers = new Set();
            data.transcripts.forEach((transcript: Transcript) => {
              if (transcript.sessionID) {
                uniqueUsers.add(transcript.sessionID);
              }
            });
            uniqueUserCount = uniqueUsers.size;
          }
          setUniqueUsers(uniqueUserCount);
          console.log(`Dashboard - Processed analytics: ${transcriptCount} transcripts, ${uniqueUserCount} unique users`);
        }
      } catch (apiError) {
        console.error("Dashboard - Error fetching analytics data:", apiError);
        setSessions(0);
        setTopIntents([]);
        setUniqueUsers(0);
      }
    } catch (error) {
      console.error("Dashboard - Error fetching dashboard data:", error);
      setDailyInteractions([]);
      setDailyRevenue([]);
      setSessions(0);
      setTopIntents([]);
      setUniqueUsers(0);
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
      date.setDate(date.getDate() + 1);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }) || [];

  const transcriptsData = dailyInteractions?.map((entry) => entry.count) || [];
  const purchasesData = dailyRevenue?.map((entry) => entry.purchases) || [];
  const revenueData = dailyRevenue?.map((entry) => entry.revenue) || [];

  const lineChartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: "Transkripte pro Tag",
        data: transcriptsData,
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
      {
        label: "Käufe pro Tag",
        data: purchasesData,
        borderColor: "#4BC0C0",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
      {
        label: "Alle Bestellungen pro Tag",  // new dataset
        data: dailyRevenue?.map((entry) => entry.allOrders || 0) || [],
        borderColor: "#FFA500",
        backgroundColor: "rgba(255, 165, 0, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const revenueChartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: "Daily Revenue (€)",
        data: revenueData,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "#FF6384",
        borderWidth: 1,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Daily Revenue" },
    },
    scales: { y: { beginAtZero: true } },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Daily Transcripts and Revenue" },
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
              Daily Transcripts and Revenue
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
              Daily Revenue
            </Text>
            <Bar data={revenueChartData} options={revenueChartOptions} />
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

        <Layout.Section>
          <Card>
            <Text as="h3" variant="headingMd">
              Chat Orders with Timestamps
            </Text>
            {isLoading ? (
              <Text as="p">Loading...</Text>
            ) : chatOrders.length === 0 ? (
              <Text as="p">Keine Chat-Bestellungen im ausgewählten Zeitraum.</Text>
            ) : (
              <div>
                {chatOrders.map((order) => {
                  const orderDate = new Date(order.created_at);
                  return (
                    <div key={order.id} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid #e6e6e6' }}>
                      <Text as="p">
                        Bestellung #{order.order_number} - {orderDate.toLocaleDateString('de-DE')} um {orderDate.toLocaleTimeString('de-DE')}
                      </Text>
                      <Text as="p">Betrag: €{order.total_price}</Text>
                      {order.userID && (
                        <Text as="p">UserID: {order.userID}</Text>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
