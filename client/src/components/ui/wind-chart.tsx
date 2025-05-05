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
import { useAuth } from "@/hooks/use-auth";
import { formatWindSpeed, getWindSpeedUnitDisplay, mpsToKmh } from "@/lib/unit-conversion";

interface WindChartProps {
  data: WindData[];
  timeRange: string;
  amberThreshold?: number;
  redThreshold?: number;
}

export function WindChart({ data, timeRange, amberThreshold = 20, redThreshold = 30 }: WindChartProps) {
  const { user } = useAuth();
  const speedUnit = user?.speedUnit || 'm/s';
  
  // Format data for the chart
  const chartData = data.map(item => {
    // Note: We assume data comes in m/s from the server
    // Store original wind speed in m/s for threshold calculations
    const originalWindSpeed = item.windSpeed;
    // Wind speed value in user's preferred unit (for display)
    const windSpeed = speedUnit === 'km/h' ? mpsToKmh(item.windSpeed) : item.windSpeed;
    let windSpeedColor = "hsl(var(--safe))";
    
    // Thresholds are in the same unit as coming from the server
    if (originalWindSpeed >= redThreshold) {
      windSpeedColor = "hsl(var(--destructive))";
    } else if (originalWindSpeed >= amberThreshold) {
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
      originalWindSpeed: originalWindSpeed, // Keep the original m/s value for thresholds
      alertState: item.alertState,
      windSpeedColor
    };
  });

  // Use custom dot to render colored dots based on thresholds
  const CustomizedDot = (props: any) => {
    const { cx, cy, value, payload } = props;
    
    // We need to use the original m/s values to determine color thresholds
    // since the displayed value might be converted to km/h
    const windSpeedMps = payload.originalWindSpeed || value;
    
    // Determine dot color based on value compared to thresholds in m/s
    let dotColor = "hsl(var(--safe))";
    if (windSpeedMps >= redThreshold) {
      dotColor = "hsl(var(--destructive))";
    } else if (windSpeedMps >= amberThreshold) {
      dotColor = "hsl(var(--warning))";
    }
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={3} 
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
            value: `Wind Speed (${getWindSpeedUnitDisplay(speedUnit)})`, 
            angle: -90, 
            position: "insideLeft",
            style: { textAnchor: "middle", fill: "#666" },
            offset: 0,
            fontSize: 12
          }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number) => [`${value.toFixed(1)} ${getWindSpeedUnitDisplay(speedUnit)}`, "Wind Speed"]}
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
          y={speedUnit === 'km/h' ? mpsToKmh(amberThreshold) : amberThreshold} 
          stroke="hsl(var(--warning))" 
          strokeDasharray="3 3" 
          strokeWidth={1.5}
          label={{ 
            value: `Amber: ${formatWindSpeed(amberThreshold, speedUnit)} ${getWindSpeedUnitDisplay(speedUnit)}`, 
            position: 'right',
            fill: "hsl(var(--warning))",
            fontSize: 11
          }} 
        />
        <ReferenceLine 
          y={speedUnit === 'km/h' ? mpsToKmh(redThreshold) : redThreshold} 
          stroke="hsl(var(--destructive))" 
          strokeDasharray="3 3" 
          strokeWidth={1.5}
          label={{ 
            value: `Red: ${formatWindSpeed(redThreshold, speedUnit)} ${getWindSpeedUnitDisplay(speedUnit)}`, 
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
