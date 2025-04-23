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
  ReferenceLine,
  Area,
  ComposedChart
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

  // Prepare data for chart with colored areas
  const chartDataWithAreas = chartData.map(point => {
    const windSpeed = point.windSpeed;
    
    // Create separate values for different threshold zones for area fill
    return {
      ...point,
      // For red area: Only fill when speed is above red threshold
      redArea: windSpeed >= redThreshold ? windSpeed - redThreshold : 0,
      
      // For amber area: Only fill between amber and red thresholds
      amberArea: windSpeed >= amberThreshold 
        ? (windSpeed >= redThreshold ? redThreshold - amberThreshold : windSpeed - amberThreshold) 
        : 0,
      
      // For normal area: Always fill up to the amber threshold or actual value if lower
      normalArea: windSpeed < amberThreshold ? windSpeed : amberThreshold,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartDataWithAreas}
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

        {/* Colored areas for different threshold zones */}
        <Area
          type="monotone"
          dataKey="redArea"
          stackId="1"
          stroke="none"
          fill="rgba(239, 68, 68, 0.2)"
          isAnimationActive={false}
          fillOpacity={0.6}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="amberArea"
          stackId="1"
          stroke="none"
          fill="rgba(245, 158, 11, 0.2)"
          isAnimationActive={false}
          fillOpacity={0.6}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="normalArea"
          stackId="1"
          stroke="none"
          fill="rgba(34, 197, 94, 0.2)"
          isAnimationActive={false}
          fillOpacity={0.6}
          activeDot={false}
        />
        
        {/* Single continuous line */}
        <Line
          type="monotone"
          dataKey="windSpeed"
          stroke="#0070f3"
          strokeWidth={2}
          dot={<CustomizedDot />}
          activeDot={{ r: 6 }}
          name="Wind Speed"
          isAnimationActive={false}
        />

        <Legend
          payload={[
            { value: 'Normal', type: 'square', color: 'hsl(var(--safe))' },
            { value: `Amber Alert (≥ ${amberThreshold} km/h)`, type: 'square', color: 'hsl(var(--warning))' },
            { value: `Red Alert (≥ ${redThreshold} km/h)`, type: 'square', color: 'hsl(var(--destructive))' }
          ]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
