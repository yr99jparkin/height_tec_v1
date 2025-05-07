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
  Customized,
  Rectangle
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

    // Format data for the chart
    const formattedData = sortedData.map(item => {
      const value = item[dataKey] as number;
      const date = new Date(item.intervalStart);
      
      // Format time display based on range
      let timeFormat = "HH:mm"; // Default for 1 day
      if (timeRange <= 1) {
        timeFormat = "HH:mm";
      } else if (timeRange < 7) {
        timeFormat = "dd MMM";
      } else {
        timeFormat = "dd MMM"; // For weeks, we'll use startOfWeek in the next step
      }
      
      // For week ranges, group by week start
      let formattedDate = format(date, timeFormat);
      if (timeRange >= 7) {
        formattedDate = format(startOfWeek(date, { weekStartsOn: 1 }), timeFormat);
      }
      
      return {
        id: item.id,
        intervalStart: item.intervalStart,
        date: date,
        time: formattedDate,
        [dataKey]: value,
        alertState: item.alertTriggered,
        amberAlert: item.amberAlertTriggered,
        redAlert: item.redAlertTriggered,
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
      return (
        <div className="custom-tooltip bg-white p-3 border border-neutral-200 shadow-md rounded-md">
          <p className="font-medium">{format(new Date(data.intervalStart), "PPpp")}</p>
          <p className="text-sm text-neutral-600">
            {dataKey === "avgWindSpeed" ? "Average" : "Maximum"} Wind Speed: 
            <span className="font-medium"> {payload[0].value.toFixed(1)} km/h</span>
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

  // Custom gradient that changes color based on thresholds
  const GradientMaker = () => {
    // Define gradient steps as percentages of the maxValue
    const redPosition = redThreshold ? (redThreshold / maxValue) * 100 : 100;
    const amberPosition = amberThreshold ? (amberThreshold / maxValue) * 100 : 0;
    
    return (
      <defs>
        <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          {/* Green zone (0 to amber threshold) */}
          <stop
            offset={`${amberPosition}%`}
            stopColor="hsl(var(--safe))"
            stopOpacity={0.8}
          />
          
          {/* Amber zone (amber threshold to red threshold) */}
          <stop
            offset={`${amberPosition}%`}
            stopColor="hsl(var(--warning))"
            stopOpacity={0.8}
          />
          
          {/* Red zone (red threshold to max) */}
          <stop
            offset={`${redPosition}%`}
            stopColor="hsl(var(--warning))"
            stopOpacity={0.8}
          />
          <stop
            offset={`${redPosition}%`}
            stopColor="hsl(var(--destructive))"
            stopOpacity={0.8}
          />
          <stop
            offset="100%"
            stopColor="hsl(var(--destructive))"
            stopOpacity={0.8}
          />
        </linearGradient>
      </defs>
    );
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
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Gradient definition for AreaChartFillByValue style */}
        <GradientMaker />
        
        {/* Reference lines for thresholds */}
        {amberThreshold && (
          <ReferenceLine 
            y={amberThreshold} 
            stroke="hsl(var(--warning))" 
            strokeDasharray="3 3" 
            strokeWidth={1.5}
            label={{
              value: `Amber Alert (${amberThreshold} km/h)`,
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
              value: `Red Alert (${redThreshold} km/h)`,
              position: "right",
              fill: "hsl(var(--destructive))",
              fontSize: 12
            }}
          />
        )}
        
        {/* Single area with gradient fill that changes based on thresholds */}
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke="#8884d8"
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#gradient-${dataKey})`}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}