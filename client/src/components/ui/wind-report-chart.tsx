import { useEffect, useState } from "react";
import { format, parseISO, addDays, isSameDay, differenceInDays, startOfWeek } from "date-fns";
import { WindDataHistorical } from "@shared/schema";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
} from "recharts";

interface WindReportChartProps {
  data: WindDataHistorical[];
  dataKey: "avgWindSpeed" | "maxWindSpeed";
  timeRange: number; // In days
  amberThreshold?: number;
  redThreshold?: number;
}

export function WindReportChart({ 
  data, 
  dataKey, 
  timeRange, 
  amberThreshold = 20, 
  redThreshold = 30 
}: WindReportChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [maxValue, setMaxValue] = useState<number>(0);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      setMaxValue(0);
      return;
    }

    // Sort data by intervalStart
    const sortedData = [...data].sort((a, b) => 
      new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );

    // Find the maximum value for scaling purposes
    let maxVal = 0;
    sortedData.forEach(item => {
      const value = item[dataKey] as number;
      if (value > maxVal) {
        maxVal = value;
      }
    });
    
    // Ensure maxValue is at least 10% higher than the highest threshold for better visualization
    const thresholdMax = Math.max(redThreshold || 0, amberThreshold || 0);
    maxVal = Math.max(maxVal, thresholdMax * 1.1);
    setMaxValue(maxVal);

    // Format data for the chart with stacked values
    const formattedData = sortedData.map(item => {
      const value = item[dataKey] as number;
      const date = new Date(item.intervalStart);
      
      // Format time display based on range for the X-axis
      let formattedDate = '';
      
      if (timeRange <= 1) {
        // For 1 day - show hours
        formattedDate = format(date, "HH:mm");
      } else if (timeRange <= 7) {
        // For 1 week or less - show day + date
        formattedDate = format(date, "EEE d");
      } else if (timeRange <= 31) {
        // For 1 month or less - show date + month
        formattedDate = format(date, "d MMM");
      } else {
        // For longer periods - show month + date
        formattedDate = format(date, "MMM d");
      }
      
      // Split the value into green, amber, and red segments for stacking
      // Always use exact values for color boundaries
      let greenValue = Math.min(value, amberThreshold);
      let amberValue = 0;
      let redValue = 0;
      
      if (value > amberThreshold) {
        if (value <= redThreshold) {
          // When value is in the amber zone
          amberValue = value - amberThreshold;
        } else {
          // When value is in the red zone
          amberValue = redThreshold - amberThreshold;
          redValue = value - redThreshold;
        }
      }
      
      return {
        id: item.id,
        intervalStart: item.intervalStart,
        date: date,
        time: formattedDate,
        [dataKey]: value, // Keep original value for tooltip
        alertState: item.alertTriggered,
        amberAlert: item.amberAlertTriggered,
        redAlert: item.redAlertTriggered,
        // Stacked values
        greenValue,
        amberValue,
        redValue,
        // For tooltip/display
        displayValue: value.toFixed(1),
      };
    });

    setChartData(formattedData);
  }, [data, dataKey, timeRange, amberThreshold, redThreshold]);

  // No data to display
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
        <p className="text-neutral-500">No wind data available for this period</p>
      </div>
    );
  }

  // Custom tooltip to display proper information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data[dataKey]; // Original value
      
      return (
        <div className="custom-tooltip bg-white p-3 border border-neutral-200 shadow-md rounded-md">
          <p className="font-medium">{format(new Date(data.intervalStart), "PPpp")}</p>
          <p className="text-sm text-neutral-600">
            {dataKey === "avgWindSpeed" ? "Average" : "Maximum"} Wind Speed: 
            <span className="font-medium"> {value.toFixed(1)} km/h</span>
          </p>
          <p className="text-xs mt-1">
            Status: 
            <span className={`font-medium ${
              data.redAlert 
                ? "text-red-600" 
                : data.amberAlert 
                  ? "text-amber-600" 
                  : "text-green-600"
            }`}>
              {data.redAlert ? " Red Alert" : data.amberAlert ? " Amber Alert" : " Normal"}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 30,
          left: 5,
          bottom: 10,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis 
          dataKey="time"
          tick={{ fontSize: 12 }} 
          tickMargin={10}
          interval={Math.max(Math.floor(chartData.length / 10), 1)}
          padding={{ left: 10, right: 10 }}
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
          domain={[0, maxValue]}
          tickFormatter={(value) => value.toFixed(0)}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Reference lines for thresholds */}
        {amberThreshold && (
          <ReferenceLine 
            y={amberThreshold} 
            stroke="hsl(var(--warning))" 
            strokeDasharray="3 3" 
            strokeWidth={1.5}
            label={{
              value: `Amber (${amberThreshold} km/h)`,
              position: "right",
              fill: "hsl(var(--warning))",
              fontSize: 12
            }}
          />
        )}
        
        {redThreshold && (
          <ReferenceLine 
            y={redThreshold} 
            stroke="hsl(var(--destructive))" 
            strokeDasharray="3 3" 
            strokeWidth={1.5}
            label={{
              value: `Red (${redThreshold} km/h)`,
              position: "right",
              fill: "hsl(var(--destructive))",
              fontSize: 12
            }}
          />
        )}
        
        {/* Stacked areas for different threshold zones */}
        <Area 
          type="stepAfter"
          dataKey="greenValue"
          stackId="stack"
          stroke="transparent"
          fill="rgba(134, 239, 172, 0.9)"
          name="Normal"
          isAnimationActive={false}
        />
        <Area 
          type="stepAfter"
          dataKey="amberValue"
          stackId="stack"
          stroke="transparent"
          fill="rgba(253, 224, 71, 0.9)"
          name="Amber Alert"
          isAnimationActive={false}
        />
        <Area 
          type="stepAfter"
          dataKey="redValue"
          stackId="stack"
          stroke="transparent"
          fill="rgba(252, 165, 165, 0.9)"
          name="Red Alert"
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}