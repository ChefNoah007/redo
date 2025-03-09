import { Bar } from "react-chartjs-2";
import {
  BarElement,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: any;
  options: any;
}

const BarChartComponent = ({ data, options }: BarChartProps) => {
  return <Bar data={data} options={options} />;
};

export default BarChartComponent;
