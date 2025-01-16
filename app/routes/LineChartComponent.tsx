import { Line } from "react-chartjs-2";

interface LineChartComponentProps {
  labels: string[];
  dataPoints: number[];
  chartLabel: string;
}

export default function LineChartComponent({
  labels,
  dataPoints,
  chartLabel,
}: LineChartComponentProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: chartLabel,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: Math.ceil(Math.max(...dataPoints) / 5),
        },
      },
    },
  };

  return <Line data={chartData} options={chartOptions} />;
}
