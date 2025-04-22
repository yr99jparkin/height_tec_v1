import { useEffect, useRef } from "react";
import { WindData } from "@shared/schema";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface WindChartProps {
  data: WindData[];
  timeRange: string;
}

export function WindChart({ data, timeRange }: WindChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    time: format(
      typeof item.timestamp === 'string' ? parseISO(item.timestamp) : item.timestamp, 
      timeRange === "1h" ? "HH:mm" : timeRange === "24h" ? "HH:mm" : "dd/MM"
    ),
    windSpeed: item.windSpeed,
    alertState: item.alertState
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }} 
          tickMargin={10}
        />
        <YAxis 
          label={{ 
            value: "Wind Speed (km/h)", 
            angle: -90, 
            position: "insideLeft",
            style: { textAnchor: "middle", fill: "#666" },
            offset: 0,
            fontSize: 12
          }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number) => [`${value.toFixed(1)} km/h`, "Wind Speed"]}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend verticalAlign="top" height={36} />
        <Line
          type="monotone"
          dataKey="windSpeed"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 6 }}
          name="Wind Speed"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
