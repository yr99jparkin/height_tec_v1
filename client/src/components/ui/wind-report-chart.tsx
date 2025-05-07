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
  ReferenceLine
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

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Sort data by intervalStart
    const sortedData = [...data].sort((a, b) => 
      new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );

    // Format data for the chart
    const formattedData = sortedData.map(item => {
      const value = item[dataKey];
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

      // Determine value zones for area fill styling (like AreaChartFillByValue)
      let zone;
      if (redThreshold && value >= redThreshold) {
        zone = "red";
      } else if (amberThreshold && value >= amberThreshold) {
        zone = "amber";
      } else {
        zone = "green";
      }
      
      return {
        id: item.id,
        intervalStart: item.intervalStart,
        date: date,
        time: formattedDate,
        [dataKey]: value,
        zone: zone,
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

  // Split the data into different zones for coloring like AreaChartFillByValue
  const greenData = chartData.map(d => ({
    ...d,
    [dataKey]: d.zone === 'green' ? d[dataKey] : amberThreshold
  }));

  const amberData = chartData.map(d => {
    if (d.zone === 'amber') {
      return {
        ...d,
        [dataKey]: d[dataKey],
        greenBase: amberThreshold
      };
    } else if (d.zone === 'red') {
      return {
        ...d,
        [dataKey]: redThreshold,
        greenBase: amberThreshold
      };
    }
    return {
      ...d,
      [dataKey]: 0,
      greenBase: 0
    };
  });

  const redData = chartData.map(d => {
    if (d.zone === 'red') {
      return {
        ...d,
        [dataKey]: d[dataKey],
        amberBase: redThreshold
      };
    }
    return {
      ...d,
      [dataKey]: 0,
      amberBase: 0
    };
  });

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
        
        {/* Green Area - below amber threshold */}
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          data={greenData}
          stroke="transparent"
          fillOpacity={0.8}
          fill="hsl(var(--safe))"
          activeDot={{ r: 6 }}
          isAnimationActive={false}
          stackId="1"
        />
        
        {/* Amber Area - between amber and red threshold */}
        <Area 
          type="monotone" 
          dataKey={dataKey}
          data={amberData}
          stroke="transparent"
          fillOpacity={0.8}
          fill="hsl(var(--warning))"
          activeDot={{ r: 6 }}
          isAnimationActive={false}
          baseValue={d => d.greenBase || 0}
          stackId="2"
        />
        
        {/* Red Area - above red threshold */}
        <Area 
          type="monotone" 
          dataKey={dataKey}
          data={redData}
          stroke="transparent"
          fillOpacity={0.8}
          fill="hsl(var(--destructive))"
          activeDot={{ r: 6 }}
          isAnimationActive={false}
          baseValue={d => d.amberBase || 0}
          stackId="3"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}