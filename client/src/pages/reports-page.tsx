import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DeviceWithLatestData } from "@shared/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, FileDown, RefreshCw, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { format, parseISO, isSameDay, differenceInDays, startOfWeek, endOfWeek, isAfter, isBefore, addDays, startOfDay, endOfDay, startOfHour, endOfHour, getHours, getDay, getWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { WindAlertThreshold, WindDataHistorical } from "@shared/schema";
import { WindReportChart } from "@/components/ui/wind-report-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";

// Define the aggregation level type
type AggregationLevel = "10min" | "1hour" | "1day" | "1week";

export default function ReportsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reportGenTime, setReportGenTime] = useState(new Date());
  // State for the selected aggregation level
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>("10min");
  // Expanded sections for aggregated data
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Update the report generation time when the report is updated
  useEffect(() => {
    setReportGenTime(new Date());
  }, [selectedDeviceId, dateRange]);

  // Fetch devices
  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<DeviceWithLatestData[]>({
    queryKey: ["/api/devices"],
  });

  // Get selected device
  const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId);

  // Fetch device thresholds
  const { data: thresholds, isLoading: isLoadingThresholds } = useQuery<WindAlertThreshold>({
    queryKey: ["/api/thresholds", selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) throw new Error("No device selected");
      const response = await apiRequest("GET", `/api/thresholds/${selectedDeviceId}`);
      if (!response.ok) throw new Error("Failed to fetch thresholds");
      return await response.json();
    },
    enabled: !!selectedDeviceId,
  });

  // Fetch historical wind data for the selected period
  const { data: windData = [], isLoading: isLoadingWindData } = useQuery<WindDataHistorical[]>({
    queryKey: ["/api/wind/historical", selectedDeviceId, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      if (!selectedDeviceId) throw new Error("No device selected");
      if (!dateRange.from || !dateRange.to) throw new Error("Date range not selected");
      const response = await apiRequest(
        "GET", 
        `/api/wind/historical/${selectedDeviceId}/range?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch wind data");
      return await response.json();
    },
    enabled: !!selectedDeviceId && !!dateRange.from && !!dateRange.to,
  });

  // Fetch downtime data for the selected period
  const { data: downtimeData, isLoading: isLoadingDowntime } = useQuery({
    queryKey: ["/api/wind/downtime", selectedDeviceId, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      if (!selectedDeviceId) throw new Error("No device selected");
      if (!dateRange.from || !dateRange.to) throw new Error("Date range not selected");
      const response = await apiRequest(
        "GET", 
        `/api/wind/downtime/${selectedDeviceId}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch downtime data");
      return await response.json();
    },
    enabled: !!selectedDeviceId && !!dateRange.from && !!dateRange.to,
  });

  // Handle the device selection
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  // Handle the update button click
  const handleUpdateReport = () => {
    setReportGenTime(new Date());
    // The queries will automatically refresh when their dependencies change
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!windData || windData.length === 0) {
      return {
        maxWindSpeed: 0,
        maxWindSpeedTime: null,
        avgWindSpeed: 0,
        totalDowntime: downtimeData?.downtimeSeconds || 0,
        greenPercentage: 0,
        amberPercentage: 0,
        redPercentage: 0
      };
    }

    let maxWindSpeed = 0;
    let maxWindSpeedTime: Date | null = null;
    let sumWindSpeed = 0;
    let totalGreenTime = 0;
    let totalAmberTime = 0;
    let totalRedTime = 0;

    windData.forEach(data => {
      // Track max wind speed
      if (data.maxWindSpeed > maxWindSpeed) {
        maxWindSpeed = data.maxWindSpeed;
        maxWindSpeedTime = new Date(data.intervalStart);
      }

      // Accumulate for average
      sumWindSpeed += data.avgWindSpeed;

      // Calculate time in each alert state
      const intervalDuration = (new Date(data.intervalEnd).getTime() - new Date(data.intervalStart).getTime()) / 1000; // in seconds
      
      if (data.redAlertTriggered) {
        totalRedTime += intervalDuration;
      } else if (data.amberAlertTriggered) {
        totalAmberTime += intervalDuration;
      } else {
        totalGreenTime += intervalDuration;
      }
    });

    const totalTime = totalGreenTime + totalAmberTime + totalRedTime;
    
    return {
      maxWindSpeed,
      maxWindSpeedTime,
      avgWindSpeed: sumWindSpeed / windData.length,
      totalDowntime: downtimeData?.downtimeSeconds || 0,
      greenPercentage: totalTime > 0 ? (totalGreenTime / totalTime) * 100 : 0,
      amberPercentage: totalTime > 0 ? (totalAmberTime / totalTime) * 100 : 0,
      redPercentage: totalTime > 0 ? (totalRedTime / totalTime) * 100 : 0
    };
  };

  const stats = calculateStats();

  // Function to format timestamp based on date range
  const formatTimestamp = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (!dateRange.from || !dateRange.to) {
      return format(date, 'dd MMM HH:mm');
    }
    
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    
    if (daysDiff <= 1) {
      // Show hours for 1 day or less
      return format(date, 'HH:mm');
    } else if (daysDiff < 7) {
      // Show day dates for less than a week
      return format(date, 'dd MMM');
    } else {
      // Show week start dates for more than a week
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'dd MMM');
    }
  };

  // Check if user exists and direct to auth page if not
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Toggle expanded section
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Format keys based on aggregation level
  const formatAggregationKey = (date: Date): string => {
    switch (aggregationLevel) {
      case "10min":
        return format(date, 'yyyy-MM-dd');
      case "1hour":
        return format(date, 'yyyy-MM-dd HH:00');
      case "1day":
        return format(date, 'yyyy-MM-dd');
      case "1week":
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd');
      default:
        return format(date, 'yyyy-MM-dd');
    }
  };
  
  // Format display headers based on aggregation level
  const formatAggregationHeader = (key: string): string => {
    const date = new Date(key);
    switch (aggregationLevel) {
      case "10min":
        return format(date, "MMMM d, yyyy");
      case "1hour":
        return format(date, "MMMM d, yyyy");
      case "1day":
        return format(date, "MMMM yyyy");
      case "1week":
        // For weekly view, just show the month name as the gray bar header
        return format(date, "MMMM yyyy");
      default:
        return format(date, "MMMM d, yyyy");
    }
  };
  
  // Aggregate data function - creates a single aggregated entry from multiple readings
  const aggregateDataPoints = (dataPoints: WindDataHistorical[]): WindDataHistorical => {
    if (dataPoints.length === 0) {
      throw new Error("Cannot aggregate empty data set");
    }
    
    // Sort by timestamp to get start and end times
    const sortedData = [...dataPoints].sort(
      (a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );
    
    const firstPoint = sortedData[0];
    const lastPoint = sortedData[sortedData.length - 1];
    
    // Calculate aggregated values
    const avgWindSpeed = sortedData.reduce((sum, point) => sum + point.avgWindSpeed, 0) / sortedData.length;
    const maxWindSpeed = Math.max(...sortedData.map(point => point.maxWindSpeed));
    
    // Check if any alerts were triggered
    const amberAlertTriggered = sortedData.some(point => point.amberAlertTriggered);
    const redAlertTriggered = sortedData.some(point => point.redAlertTriggered);
    
    // Calculate downtime
    const downtimeSeconds = sortedData.reduce((sum, point) => sum + (point.downtimeSeconds || 0), 0);
    
    // Create aggregated data point
    return {
      ...firstPoint,
      id: firstPoint.id, // Keep original ID for React keys
      intervalStart: firstPoint.intervalStart,
      intervalEnd: lastPoint.intervalEnd,
      avgWindSpeed,
      maxWindSpeed,
      amberAlertTriggered,
      redAlertTriggered,
      downtimeSeconds,
    };
  };
  
  // Group and aggregate data for the table based on selected aggregation level
  const aggregateWindData = (data: WindDataHistorical[], level: AggregationLevel): { [key: string]: WindDataHistorical[] } => {
    if (!data.length) return {};
    
    const aggregatedData: { [key: string]: WindDataHistorical[] } = {};
    
    // Group based on appropriate time period
    data.forEach(point => {
      const date = new Date(point.intervalStart);
      let key: string;
      
      switch (level) {
        case "10min":
          // For raw data, just group by date
          key = format(date, 'yyyy-MM-dd');
          break;
        case "1hour":
          // For hourly data, group by date (not by hour)
          key = format(startOfDay(date), 'yyyy-MM-dd');
          break;
        case "1day":
          // For daily data, group by month
          key = format(date, 'yyyy-MM');
          break;
        case "1week":
          // For weekly data, group by month for the gray bar headers
          key = format(date, 'yyyy-MM');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }
      
      if (!aggregatedData[key]) {
        aggregatedData[key] = [];
      }
      
      aggregatedData[key].push(point);
    });
    
    // For 1hour, 1day, and 1week, we need to aggregate the data points into single entries
    if (level !== "10min") {
      // Further aggregate hourly, daily, or weekly data points
      Object.keys(aggregatedData).forEach(key => {
        const dataPoints = aggregatedData[key];
        
        if (level === "1hour") {
          // For hourly view, aggregate into hourly chunks
          const hourlyGroups: { [hourKey: string]: WindDataHistorical[] } = {};
          
          dataPoints.forEach(point => {
            const hourKey = format(new Date(point.intervalStart), 'yyyy-MM-dd HH:00');
            if (!hourlyGroups[hourKey]) {
              hourlyGroups[hourKey] = [];
            }
            hourlyGroups[hourKey].push(point);
          });
          
          aggregatedData[key] = Object.values(hourlyGroups).map(points => aggregateDataPoints(points));
          
        } else if (level === "1day") {
          // For daily view, aggregate data by each day
          const dailyGroups: { [dayKey: string]: WindDataHistorical[] } = {};
          
          dataPoints.forEach(point => {
            const date = new Date(point.intervalStart);
            const dayKey = format(date, 'yyyy-MM-dd');
            if (!dailyGroups[dayKey]) {
              dailyGroups[dayKey] = [];
            }
            dailyGroups[dayKey].push(point);
          });
          
          aggregatedData[key] = Object.values(dailyGroups).map(points => aggregateDataPoints(points));
          
        } else if (level === "1week") {
          // For weekly view, aggregate by each week
          const weeklyGroups: { [weekKey: string]: WindDataHistorical[] } = {};
          
          dataPoints.forEach(point => {
            const date = new Date(point.intervalStart);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekKey = format(weekStart, 'yyyy-MM-dd');
            if (!weeklyGroups[weekKey]) {
              weeklyGroups[weekKey] = [];
            }
            weeklyGroups[weekKey].push(point);
          });
          
          aggregatedData[key] = Object.values(weeklyGroups).map(points => aggregateDataPoints(points));
        }
      });
    }
    
    return aggregatedData;
  };
  
  // Generate the grouped data based on current aggregation level
  const groupedData = useMemo(() => 
    aggregateWindData(windData, aggregationLevel), 
    [windData, aggregationLevel]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        <div className="flex-1 flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-heading font-semibold text-neutral-800">Wind Reports</h1>
            <Button 
              variant="outline"
              disabled={!selectedDeviceId || windData.length === 0}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
          
          <div className="bg-white border border-neutral-300 rounded-lg p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Device Selector */}
              <div className="space-y-2">
                <Label htmlFor="device-select">Select Device</Label>
                <Select
                  value={selectedDeviceId}
                  onValueChange={handleDeviceChange}
                  disabled={isLoadingDevices}
                >
                  <SelectTrigger id="device-select">
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Picker */}
              <div className="space-y-2">
                <Label>Date & Time Range</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "PPP HH:mm")} - {format(dateRange.to, "PPP HH:mm")}
                          </>
                        ) : (
                          format(dateRange.from, "PPP HH:mm")
                        )
                      ) : (
                        <span>Pick a date and time range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-6" align="start">
                    <div className="grid gap-6">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from || new Date()}
                        selected={{
                          from: dateRange?.from,
                          to: dateRange?.to,
                        }}
                        onSelect={(range) => {
                          if (range?.from) {
                            // Preserve the previous time when changing the date
                            const newFrom = new Date(range.from);
                            if (dateRange.from) {
                              newFrom.setHours(
                                dateRange.from.getHours(),
                                dateRange.from.getMinutes(),
                                0, 0
                              );
                            }
                            
                            let newTo;
                            if (range.to) {
                              newTo = new Date(range.to);
                              if (dateRange.to) {
                                // Preserve time for end date
                                newTo.setHours(
                                  dateRange.to.getHours(),
                                  dateRange.to.getMinutes(),
                                  59, 999
                                );
                              } else {
                                // Default end time to 23:59:59
                                newTo.setHours(23, 59, 59, 999);
                              }
                            } else {
                              newTo = new Date(newFrom);
                              newTo.setHours(23, 59, 59, 999);
                            }
                            
                            setDateRange({
                              from: newFrom,
                              to: newTo
                            });
                          }
                        }}
                        numberOfMonths={2}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="block mb-2">Start Time</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-neutral-500" />
                            <Input 
                              type="time" 
                              value={dateRange.from ? format(dateRange.from, "HH:mm") : "00:00"}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                if (!isNaN(hours) && !isNaN(minutes)) {
                                  // Use current date if from is undefined
                                  const newFrom = new Date(dateRange.from || new Date());
                                  newFrom.setHours(hours, minutes, 0, 0);
                                  setDateRange({
                                    from: newFrom,
                                    to: dateRange.to
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="block mb-2">End Time</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-neutral-500" />
                            <Input 
                              type="time" 
                              value={dateRange.to ? format(dateRange.to, "HH:mm") : "23:59"}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                if (!isNaN(hours) && !isNaN(minutes)) {
                                  // Use current date if to is undefined
                                  const newTo = new Date(dateRange.to || new Date());
                                  newTo.setHours(hours, minutes, 59, 999);
                                  setDateRange({
                                    from: dateRange.from,
                                    to: newTo
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button onClick={() => setIsCalendarOpen(false)}>
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Update Button */}
              <div className="flex items-end">
                <Button 
                  className="w-full"
                  onClick={handleUpdateReport}
                  disabled={!selectedDeviceId}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Report
                </Button>
              </div>
            </div>
          </div>

          {selectedDeviceId && (
            <div className="bg-white border border-neutral-300 rounded-lg shadow-sm">
              {/* Report Header */}
              <div className="border-b border-neutral-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg">Wind Report</div>
                    <div className="text-sm text-neutral-500">
                      Generated: {format(reportGenTime, "PPp")}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {dateRange.from && dateRange.to && (
                      <span>
                        Period: {format(dateRange.from, "PPP p")} - {format(dateRange.to, "PPP p")}
                      </span>
                    )}
                  </div>
                </div>

                {selectedDevice && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Device</h3>
                      <p className="font-medium">{selectedDevice.deviceName}</p>
                      <p className="text-sm text-neutral-600">{selectedDevice.deviceId}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Location</h3>
                      <p className="font-medium">{selectedDevice.location || "N/A"}</p>
                      <p className="text-sm text-neutral-600">{selectedDevice.project || "No project assigned"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Threshold Settings</h3>
                      {thresholds ? (
                        <div className="text-sm">
                          <p>Amber Alert: &gt;= {thresholds.amberThreshold} km/h</p>
                          <p>Red Alert: &gt;= {thresholds.redThreshold} km/h</p>
                        </div>
                      ) : isLoadingThresholds ? (
                        <Skeleton className="h-10 w-32" />
                      ) : (
                        <p className="text-sm text-neutral-600">No thresholds configured</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Report Content */}
              <div className="p-6">
                {isLoadingWindData ? (
                  <>
                    <Skeleton className="h-[250px] w-full mb-6" />
                    <Skeleton className="h-[250px] w-full mb-6" />
                    <Skeleton className="h-[300px] w-full" />
                  </>
                ) : windData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-neutral-500">No wind data available for the selected period</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Statistics */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-4">Summary Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Maximum Wind Speed</h4>
                          <p className="text-xl font-bold">{stats.maxWindSpeed.toFixed(1)} km/h</p>
                          {stats.maxWindSpeedTime && (
                            <p className="text-xs text-neutral-600">at {format(stats.maxWindSpeedTime, "PPp")}</p>
                          )}
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Average Wind Speed</h4>
                          <p className="text-xl font-bold">{stats.avgWindSpeed.toFixed(1)} km/h</p>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Total Downtime</h4>
                          <p className="text-xl font-bold">{(stats.totalDowntime / 3600).toFixed(1)} hours</p>
                        </div>
                      </div>
                    </div>

                    {/* Wind Speed Charts */}
                    <div className="space-y-8 mb-8">
                      {/* Max Wind Speed Chart */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Maximum Wind Speed</h3>
                        <div className="h-[250px]">
                          <WindReportChart 
                            data={windData}
                            dataKey="maxWindSpeed"
                            timeRange={dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 1}
                            amberThreshold={thresholds?.amberThreshold}
                            redThreshold={thresholds?.redThreshold}
                          />
                        </div>
                      </div>

                      {/* Average Wind Speed Chart */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Average Wind Speed</h3>
                        <div className="h-[250px]">
                          <WindReportChart 
                            data={windData}
                            dataKey="avgWindSpeed"
                            timeRange={dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 1}
                            amberThreshold={thresholds?.amberThreshold}
                            redThreshold={thresholds?.redThreshold}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Detailed Data Table */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Detailed Data</h3>
                        <div className="flex items-center justify-end">
                          <Label className="mr-2">Show data in:</Label>
                          <RadioGroup
                            value={aggregationLevel}
                            onValueChange={(value) => setAggregationLevel(value as AggregationLevel)}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="10min" id="r-10min" />
                              <Label htmlFor="r-10min" className="cursor-pointer">10 Min</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="1hour" id="r-1hour" />
                              <Label htmlFor="r-1hour" className="cursor-pointer">1 Hour</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="1day" id="r-1day" />
                              <Label htmlFor="r-1day" className="cursor-pointer">1 Day</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="1week" id="r-1week" />
                              <Label htmlFor="r-1week" className="cursor-pointer">1 Week</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden">
                        {Object.keys(groupedData).length > 0 ? (
                          <div className="divide-y">
                            {Object.entries(groupedData)
                              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                              .map(([key, entries]) => {
                                const sectionId = `section-${key}`;
                                const isExpanded = expandedSections[sectionId] !== false; // Default to expanded
                                
                                return (
                                  <div key={key} className="divide-y">
                                    <button 
                                      className="bg-neutral-200 px-4 py-2 font-medium w-full text-left flex justify-between items-center hover:bg-neutral-300 transition-colors rounded-lg shadow-sm mb-2"
                                      onClick={() => toggleSection(sectionId)}
                                    >
                                      <span>{formatAggregationHeader(key)}</span>
                                      <span>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                                    </button>
                                    
                                    {isExpanded && (
                                      <table className="min-w-full divide-y divide-neutral-200">
                                        <thead>
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time Period</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Wind Speed</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Max Wind Speed</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Downtime</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200">
                                          {entries
                                            .sort((a, b) => new Date(b.intervalStart).getTime() - new Date(a.intervalStart).getTime())
                                            .map((entry) => {
                                              // Determine cell background colors based on thresholds
                                              const getAvgWindSpeedClass = () => {
                                                if (!thresholds) return "";
                                                if (entry.avgWindSpeed >= thresholds.redThreshold) 
                                                  return "bg-red-500 bg-opacity-20 text-red-900";
                                                if (entry.avgWindSpeed >= thresholds.amberThreshold) 
                                                  return "bg-amber-500 bg-opacity-20 text-amber-900";
                                                return "bg-green-500 bg-opacity-20 text-green-900";
                                              };
                                              
                                              const getMaxWindSpeedClass = () => {
                                                if (!thresholds) return "";
                                                if (entry.maxWindSpeed >= thresholds.redThreshold) 
                                                  return "bg-red-500 bg-opacity-20 text-red-900";
                                                if (entry.maxWindSpeed >= thresholds.amberThreshold) 
                                                  return "bg-amber-500 bg-opacity-20 text-amber-900";
                                                return "bg-green-500 bg-opacity-20 text-green-900";
                                              };
                                              
                                              const getAlertStatusClass = () => {
                                                if (entry.redAlertTriggered) 
                                                  return "bg-red-500 bg-opacity-20 text-red-900";
                                                if (entry.amberAlertTriggered) 
                                                  return "bg-amber-500 bg-opacity-20 text-amber-900";
                                                return "bg-green-500 bg-opacity-20 text-green-900";
                                              };
                                              
                                              const getAlertStatusText = () => {
                                                if (entry.redAlertTriggered) return "Red Alert";
                                                if (entry.amberAlertTriggered) return "Amber Alert";
                                                return "Normal";
                                              };
                                              
                                              // Format time period based on aggregation level
                                              const formatTimePeriod = () => {
                                                const start = new Date(entry.intervalStart);
                                                const end = new Date(entry.intervalEnd);
                                                
                                                switch (aggregationLevel) {
                                                  case "10min":
                                                    return format(start, "HH:mm");
                                                  case "1hour":
                                                    return format(start, "HH:mm");
                                                  case "1day":
                                                    return format(start, "MMMM d");
                                                  case "1week":
                                                    const weekStartDate = startOfWeek(start, { weekStartsOn: 1 });
                                                    return `w/c ${format(weekStartDate, "MMM d")}`;
                                                  default:
                                                    return format(start, "HH:mm");
                                                }
                                              };
                                              
                                              // Format downtime for aggregated data
                                              const formatDowntime = () => {
                                                const seconds = entry.downtimeSeconds || 0;
                                                if (seconds < 60) {
                                                  return `${seconds.toFixed(0)}s`;
                                                } else if (seconds < 3600) {
                                                  return `${(seconds / 60).toFixed(1)}m`;
                                                } else {
                                                  return `${(seconds / 3600).toFixed(1)}h`;
                                                }
                                              };
                                              
                                              return (
                                                <tr key={entry.id}>
                                                  <td className="px-4 py-2 text-sm">
                                                    {formatTimePeriod()}
                                                  </td>
                                                  <td className={`px-4 py-2 text-sm ${getAvgWindSpeedClass()}`}>
                                                    {entry.avgWindSpeed.toFixed(1)} km/h
                                                  </td>
                                                  <td className={`px-4 py-2 text-sm ${getMaxWindSpeedClass()}`}>
                                                    {entry.maxWindSpeed.toFixed(1)} km/h
                                                  </td>
                                                  <td className="px-4 py-2 text-sm">
                                                    {formatDowntime()}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-neutral-500">No detailed data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}