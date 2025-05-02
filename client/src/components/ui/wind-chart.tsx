import { WindData } from "@shared/schema";
import { format, parseISO } from "date-fns";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
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
    
    // Get date object for the item
    const dateObj = typeof item.timestamp === 'string' ? parseISO(item.timestamp) : item.timestamp;
    
    // Format time display based on range
    let timeFormat = "HH:mm"; // Default for 1h
    if (timeRange === "3h") {
      timeFormat = "HH:mm";
    } else if (timeRange === "30d") {
      timeFormat = "dd/MM";
    }
    
    return {
      // Store original date for tooltips
      date: dateObj,
      // Format for display
      time: format(dateObj, timeFormat),
      windSpeed: windSpeed,
      alertState: item.alertState,
      windSpeedColor
    };
  });

  // Use custom dot to render colored dots based on thresholds
  const CustomizedDot = (props: any) => {
    const { cx, cy, value } = props;
    
    // Determine dot color based on value compared to thresholds
    let dotColor = "hsl(var(--safe))";
    if (value >= redThreshold) {
      dotColor = "hsl(var(--destructive))";
    } else if (value >= amberThreshold) {
      dotColor = "hsl(var(--warning))";
    }
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        fill={dotColor} 
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  // No need for additional data processing

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
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
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0 && payload[0].payload.date) {
              const date = payload[0].payload.date;
              if (timeRange === "30d") {
                return `${format(date, "dd MMM yyyy")} ${format(date, "HH:mm")}`;
              }
              return `${format(date, "dd MMM yyyy")} ${label}`;
            }
            return `Time: ${label}`;
          }}
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

        {/* No shaded areas as per user request */}
        
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}
