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
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface WindChartProps {
  data: WindData[];
  timeRange: string;
  amberThreshold?: number;
  redThreshold?: number;
}

export function WindChart({ data, timeRange, amberThreshold = 20, redThreshold = 30 }: WindChartProps) {
  // Format data for the chart
  const chartData = data.map(item => {
    const windSpeed = item.windSpeed;
    let windSpeedColor = "hsl(var(--safe))";
    
    if (windSpeed >= redThreshold) {
      windSpeedColor = "hsl(var(--destructive))";
    } else if (windSpeed >= amberThreshold) {
      windSpeedColor = "hsl(var(--warning))";
    }
    
    return {
      time: format(
        typeof item.timestamp === 'string' ? parseISO(item.timestamp) : item.timestamp, 
        timeRange === "1h" ? "HH:mm" : timeRange === "24h" ? "HH:mm" : "dd/MM"
      ),
      windSpeed: windSpeed,
      alertState: item.alertState,
      windSpeedColor
    };
  });

  // Use custom dot to render colored dots based on thresholds
  const CustomizedDot = (props: any) => {
    const { cx, cy, value, windSpeedColor } = props;
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={3} 
        fill={windSpeedColor || "#0070f3"} 
      />
    );
  };

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
        
        {/* Threshold reference lines */}
        <ReferenceLine 
          y={amberThreshold} 
          stroke="hsl(var(--warning))" 
          strokeDasharray="3 3" 
          strokeWidth={1.5}
          label={{ 
            value: `Amber: ${amberThreshold} km/h`, 
            position: 'right',
            fill: "hsl(var(--warning))",
            fontSize: 11
          }} 
        />
        <ReferenceLine 
          y={redThreshold} 
          stroke="hsl(var(--destructive))" 
          strokeDasharray="3 3" 
          strokeWidth={1.5}
          label={{ 
            value: `Red: ${redThreshold} km/h`, 
            position: 'right',
            fill: "hsl(var(--destructive))",
            fontSize: 11  
          }} 
        />
        
        <Line
          type="monotone"
          dataKey="windSpeed"
          strokeWidth={2}
          dot={<CustomizedDot />}
          activeDot={{ r: 6 }}
          name="Wind Speed"
          stroke="none"
          isAnimationActive={false}
        />
        
        {/* Create segments with different colors based on thresholds */}
        {['safe', 'amber', 'red'].map((segment) => {
          let dataKey = "windSpeed";
          let color, dataPoints;
          
          if (segment === 'red') {
            color = "hsl(var(--destructive))";
            dataPoints = chartData.map(point => point.windSpeed >= redThreshold ? point.windSpeed : null);
          } else if (segment === 'amber') {
            color = "hsl(var(--warning))";
            dataPoints = chartData.map(point => point.windSpeed >= amberThreshold && point.windSpeed < redThreshold ? point.windSpeed : null);
          } else {
            color = "hsl(var(--safe))";
            dataPoints = chartData.map(point => point.windSpeed < amberThreshold ? point.windSpeed : null);
          }
          
          const segmentData = chartData.map((point, index) => ({
            ...point,
            [`windSpeed_${segment}`]: dataPoints[index]
          }));
          
          return (
            <Line
              key={segment}
              type="monotone"
              data={segmentData}
              dataKey={`windSpeed_${segment}`}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
