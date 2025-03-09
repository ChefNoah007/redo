import { Line } from "react-chartjs-2";
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

// Register ChartJS components
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

interface LineChartProps {
  data: any;
  options: any;
}

const LineChartComponent = ({ data, options }: LineChartProps) => {
  return <Line data={data} options={options} />;
};

export default LineChartComponent;
