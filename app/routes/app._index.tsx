import { useEffect, useState, lazy, Suspense } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { SkeletonChart, SkeletonTable } from "../components/SkeletonComponents";

// Lazy load chart components
const LineChartComponent = lazy(() => import("./LineChartComponent"));
const BarChartComponent = lazy(() => import("./BarChartComponent"));

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
      // Get the shop domain from the URL or localStorage
      const url = new URL(window.location.href);
      let shop = url.searchParams.get("shop") || "";
      
      // If shop is not in URL, try to get it from localStorage
      if (!shop) {
        shop = localStorage.getItem("shopDomain") || "";
        console.log(`Dashboard - Retrieved shop from localStorage: ${shop}`);
      } else {
        // Store shop in localStorage for future use
        localStorage.setItem("shopDomain", shop);
        console.log(`Dashboard - Stored shop in localStorage: ${shop}`);
      }
      
      console.log(`Dashboard - Fetching daily revenue with shop: ${shop}`);
      
      const response = await fetch(`/daily-data?timeRange=${selectedTimeRange}&shop=${shop}`, {
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

  // Fetch intent data from our new API endpoint
  const fetchIntentData = async (selectedTimeRange: string): Promise<IntentData[]> => {
    try {
      console.log("Dashboard - Fetching intent data with time range:", selectedTimeRange);
      const response = await fetch("/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange: selectedTimeRange }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Dashboard - Intent API request failed: ${response.status} ${response.statusText}`, errorText);
        return [];
      }
      
      const data = await response.json();
      console.log("Dashboard - Intent API response:", data);
      
      if (data && Array.isArray(data.intents)) {
        console.log(`Dashboard - Received ${data.intents.length} intents`);
        return data.intents;
      } else {
        console.warn("Dashboard - No intents found in API response");
        return [];
      }
    } catch (error) {
      console.error("Dashboard - Error fetching intent data:", error);
      return [];
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (selectedTimeRange: string) => {
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
        return { transcriptCount: 0, uniqueUserCount: 0 };
      }
      
      const data = await response.json();
      console.log("Dashboard - Analytics API response:", data);
      const transcriptCount = Array.isArray(data.transcripts) ? data.transcripts.length : 0;
      
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
      
      console.log(`Dashboard - Processed analytics: ${transcriptCount} transcripts, ${uniqueUserCount} unique users`);
      return { transcriptCount, uniqueUserCount };
    } catch (error) {
      console.error("Dashboard - Error fetching analytics data:", error);
      return { transcriptCount: 0, uniqueUserCount: 0 };
    }
  };

  // 3) Gesamtdaten (Analytics, Transcripts, Revenue) laden - Optimiert für parallele Ausführung
  const fetchDashboardData = async (selectedTimeRange: string) => {
    setIsLoading(true);
    try {
      console.log("Dashboard - Fetching all data in parallel");
      
      // Alle API-Aufrufe parallel ausführen
      const [
        dailyTranscriptsData,
        dailyRevenueData,
        intentData,
        analyticsData
      ] = await Promise.all([
        fetchDailyTranscripts(selectedTimeRange),
        fetchDailyRevenue(selectedTimeRange),
        fetchIntentData(selectedTimeRange),
        fetchAnalyticsData(selectedTimeRange)
      ]);
      
      // Ergebnisse setzen
      setDailyInteractions(dailyTranscriptsData);
      setDailyRevenue(dailyRevenueData);
      setTopIntents(intentData);
      setSessions(analyticsData.transcriptCount);
      setUniqueUsers(analyticsData.uniqueUserCount);
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
        borderColor: "#F0F1F0",
        backgroundColor: "rgba(200, 200, 200, 0.5)", // Darker version of F0F1F0 with more opacity for visibility
        tension: 0.4,
      },
      {
        label: "Käufe pro Tag",
        data: purchasesData,
        borderColor: "#F1C232",
        backgroundColor: "rgba(241, 194, 50, 0.4)", // Increased opacity for better visibility
        tension: 0.4,
      },
      {
        label: "Alle Bestellungen pro Tag",  // new dataset
        data: dailyRevenue?.map((entry) => entry.allOrders || 0) || [],
        borderColor: "#109959",
        backgroundColor: "rgba(16, 153, 89, 0.4)", // Increased opacity for better visibility
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
        backgroundColor: "rgba(75, 68, 54, 0.4)", // Increased opacity for better visibility
        borderColor: "#4B4436",
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
              <SkeletonChart />
            ) : (
              <Suspense fallback={<SkeletonChart />}>
                <LineChartComponent data={lineChartData} options={lineChartOptions} />
              </Suspense>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Daily Revenue
            </Text>
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <Suspense fallback={<SkeletonChart />}>
                <BarChartComponent data={revenueChartData} options={revenueChartOptions} />
              </Suspense>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h3" variant="headingMd">
              Top Intents
            </Text>
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <Suspense fallback={<SkeletonChart />}>
                <BarChartComponent
                  data={{
                    labels: topIntents?.map((intent) => intent.name) || [],
                    datasets: [
                      {
                        label: "Top Intents",
                        data: topIntents?.map((intent) => intent.count) || [],
                        backgroundColor: [
                          "#CCCCCC", // Darker version of F0F1F0 for better visibility against white background
                          "#F1C232",
                          "#109959",
                          "#4B4436",
                          "rgba(16, 153, 89, 0.7)", // Variation of #109959 for the fifth color if needed
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
              </Suspense>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h3" variant="headingMd">
              Chat Orders with Timestamps
            </Text>
            {isLoading ? (
              <SkeletonTable />
            ) : chatOrders.length === 0 ? (
              <Text as="p">Keine Chat-Bestellungen im ausgewählten Zeitraum.</Text>
            ) : (
              <div>
              {chatOrders.map((order) => {
                const orderDate = new Date(order.created_at);
                return (
                  <div key={order.id} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid #e6e6e6' }}>
                    {order.userID ? (
                      // Clickable order with border for orders with UserID
                      <Link 
                        to={`/app/additional?userID=${order.userID}`} 
                        style={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          display: 'block',
                          padding: '8px',
                          border: '1px solid #109959',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Text as="p">
                          Bestellung #{order.order_number} - {orderDate.toLocaleDateString('de-DE')} um {orderDate.toLocaleTimeString('de-DE')}
                        </Text>
                        <Text as="p">Betrag: €{order.total_price}</Text>
                        <Text as="p">UserID: {order.userID}</Text>
                      </Link>
                    ) : (
                      // Non-clickable order without border
                      <>
                        <Text as="p">
                          Bestellung #{order.order_number} - {orderDate.toLocaleDateString('de-DE')} um {orderDate.toLocaleTimeString('de-DE')}
                        </Text>
                        <Text as="p">Betrag: €{order.total_price}</Text>
                      </>
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
