import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DeviceWithLatestData } from "@shared/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, FileDown, RefreshCw } from "lucide-react";
import { format, parseISO, isSameDay, differenceInDays, startOfWeek, isAfter, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { WindAlertThreshold, WindDataHistorical } from "@shared/schema";
import { WindReportChart } from "@/components/ui/wind-report-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function ReportsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reportGenTime, setReportGenTime] = useState(new Date());

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
    queryKey: ["/api/wind/historical", selectedDeviceId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!selectedDeviceId) throw new Error("No device selected");
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
    queryKey: ["/api/wind/downtime", selectedDeviceId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!selectedDeviceId) throw new Error("No device selected");
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

  // Group data by date for the table
  const groupedData: { [key: string]: WindDataHistorical[] } = {};
  windData.forEach(data => {
    const dateKey = format(new Date(data.intervalStart), 'yyyy-MM-dd');
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = [];
    }
    groupedData[dateKey].push(data);
  });

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
                <Label>Date Range</Label>
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
                            {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                          </>
                        ) : (
                          format(dateRange.from, "PPP")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={{
                        from: dateRange?.from,
                        to: dateRange?.to,
                      }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({
                            from: range.from,
                            to: new Date(range.to.setHours(23, 59, 59, 999))
                          });
                          setIsCalendarOpen(false);
                        } else if (range?.from) {
                          setDateRange({
                            from: range.from,
                            to: range.from
                          });
                        }
                      }}
                      numberOfMonths={2}
                    />
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
                        Period: {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
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
                    {/* Wind Speed Charts */}
                    <div className="space-y-8 mb-8">
                      {/* Max Wind Speed Chart */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Maximum Wind Speed</h3>
                        <div className="h-[250px]">
                          <WindReportChart 
                            data={windData}
                            dataKey="maxWindSpeed"
                            timeRange={differenceInDays(dateRange.to, dateRange.from)}
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
                            timeRange={differenceInDays(dateRange.to, dateRange.from)}
                            amberThreshold={thresholds?.amberThreshold}
                            redThreshold={thresholds?.redThreshold}
                          />
                        </div>
                      </div>
                    </div>

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

                    {/* Detailed Data Table */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Detailed Data</h3>
                      <div className="border rounded-lg overflow-hidden">
                        {Object.keys(groupedData).length > 0 ? (
                          <div className="divide-y">
                            {Object.entries(groupedData)
                              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                              .map(([date, entries]) => (
                                <div key={date} className="divide-y">
                                  <div className="bg-neutral-100 px-4 py-2 font-medium">
                                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                                  </div>
                                  <table className="min-w-full divide-y divide-neutral-200">
                                    <thead>
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Wind Speed</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Max Wind Speed</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Alert Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                      {entries
                                        .sort((a, b) => new Date(b.intervalStart).getTime() - new Date(a.intervalStart).getTime())
                                        .map((entry) => {
                                          // Determine cell background colors based on thresholds
                                          const getAvgWindSpeedClass = () => {
                                            if (!thresholds) return "";
                                            if (entry.avgWindSpeed >= thresholds.redThreshold) return "bg-red-100";
                                            if (entry.avgWindSpeed >= thresholds.amberThreshold) return "bg-amber-100";
                                            return "bg-green-100";
                                          };
                                          
                                          const getMaxWindSpeedClass = () => {
                                            if (!thresholds) return "";
                                            if (entry.maxWindSpeed >= thresholds.redThreshold) return "bg-red-100";
                                            if (entry.maxWindSpeed >= thresholds.amberThreshold) return "bg-amber-100";
                                            return "bg-green-100";
                                          };
                                          
                                          const getAlertStatusClass = () => {
                                            if (entry.redAlertTriggered) return "bg-red-100";
                                            if (entry.amberAlertTriggered) return "bg-amber-100";
                                            return "bg-green-100";
                                          };
                                          
                                          const getAlertStatusText = () => {
                                            if (entry.redAlertTriggered) return "Red Alert";
                                            if (entry.amberAlertTriggered) return "Amber Alert";
                                            return "Normal";
                                          };
                                          
                                          return (
                                            <tr key={entry.id}>
                                              <td className="px-4 py-2 text-sm">
                                                {format(new Date(entry.intervalStart), "HH:mm")} - {format(new Date(entry.intervalEnd), "HH:mm")}
                                              </td>
                                              <td className={`px-4 py-2 text-sm ${getAvgWindSpeedClass()}`}>
                                                {entry.avgWindSpeed.toFixed(1)} km/h
                                              </td>
                                              <td className={`px-4 py-2 text-sm ${getMaxWindSpeedClass()}`}>
                                                {entry.maxWindSpeed.toFixed(1)} km/h
                                              </td>
                                              <td className={`px-4 py-2 text-sm ${getAlertStatusClass()}`}>
                                                {getAlertStatusText()}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
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