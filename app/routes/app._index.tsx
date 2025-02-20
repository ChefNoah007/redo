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
import { authenticate } from "../shopify.server";

const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
const PROJECT_ID = "6703af9afcd0ea507e9c5369";

interface AnalyticsData {
  interactions: number;
  revenue: number;
  date: string;
}

const timeRanges = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
  { label: "Last 6 Months", value: "180d" },
  { label: "Last 12 Months", value: "365d" },
];

function parseDays(timeRange: string): number {
  return parseInt(timeRange.replace("d", ""), 10);
}

async function fetchAnalytics(timeRange: string) {
  const days = parseDays(timeRange);
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  
  try {
    const response = await fetch("https://redo-ia4o.onrender.com/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resources: [{
          type: "runtime.interactions",
          filter: {
            projectID: PROJECT_ID,
            from: startTime,
            to: now.toISOString()
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Analytics fetch error:", error);
    throw error;
  }
}

export function Dashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const fetcher = useFetcher();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAnalytics(selectedTimeRange);
        setAnalyticsData(data);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <Select
              label="Time Range"
              options={timeRanges}
              onChange={(value) => setSelectedTimeRange(value)}
              value={selectedTimeRange}
            />
          </Card>
        </Layout.Section>
        {/* Analytics display components here */}
      </Layout>
    </Page>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default Dashboard;