import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { WindDataHistorical, WindAlertThreshold } from '@shared/schema';
import { DeviceWithLatestData } from '@shared/types';

interface ReportStats {
  maxWindSpeed: number;
  maxWindSpeedTime: Date | null;
  avgWindSpeed: number;
  totalDowntime: number;
  greenPercentage: number;
  amberPercentage: number;
  redPercentage: number;
}

/**
 * Generates a PDF report with wind data and statistics
 */
export async function generateWindReportPDF({
  device,
  windData,
  dateRange,
  stats,
  thresholds,
  reportGenTime
}: {
  device: DeviceWithLatestData;
  windData: WindDataHistorical[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  stats: ReportStats;
  thresholds: WindAlertThreshold | undefined;
  reportGenTime: Date;
}) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a new page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();
  
  // Load standard fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set default font and sizes
  const titleSize = 20;
  const subtitleSize = 16;
  const normalSize = 11;
  const smallSize = 9;
  
  // Define colors
  const black = rgb(0, 0, 0);
  const gray = rgb(0.5, 0.5, 0.5);
  const green = rgb(0.13, 0.77, 0.37);
  const amber = rgb(0.96, 0.62, 0.04);
  const red = rgb(0.94, 0.27, 0.27);
  
  // Title
  page.drawText('Wind Report', {
    x: 50,
    y: height - 50,
    size: titleSize,
    font: helveticaBold,
    color: black,
  });
  
  // Add report generation time
  page.drawText(`Generated: ${format(reportGenTime, 'PPpp')}`, {
    x: 50,
    y: height - 80,
    size: normalSize,
    font: helveticaFont,
    color: gray,
  });
  
  // Device info
  page.drawText(`Device: ${device.deviceName}`, {
    x: 50,
    y: height - 110,
    size: normalSize,
    font: helveticaBold,
    color: black,
  });
  
  // Location info if available
  if (device.location) {
    page.drawText(`Location: ${device.location}`, {
      x: 50,
      y: height - 130,
      size: normalSize,
      font: helveticaFont,
      color: black,
    });
  }
  
  // Date range
  if (dateRange.from && dateRange.to) {
    page.drawText(`Period: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`, {
      x: 50,
      y: height - 150,
      size: normalSize,
      font: helveticaFont,
      color: black,
    });
  }
  
  // Threshold info
  if (thresholds) {
    page.drawText(`Alert Thresholds:`, {
      x: 50,
      y: height - 170,
      size: normalSize,
      font: helveticaBold,
      color: black,
    });
    
    page.drawText(`Amber: ${thresholds.amberThreshold} km/h`, {
      x: 70,
      y: height - 190,
      size: normalSize,
      font: helveticaFont,
      color: amber,
    });
    
    page.drawText(`Red: ${thresholds.redThreshold} km/h`, {
      x: 70,
      y: height - 210,
      size: normalSize,
      font: helveticaFont,
      color: red,
    });
  }
  
  // Summary Statistics Section
  page.drawText('Summary Statistics', {
    x: 50,
    y: height - 250,
    size: subtitleSize,
    font: helveticaBold,
    color: black,
  });
  
  // Draw statistics
  page.drawText(`Maximum Wind Speed: ${stats.maxWindSpeed.toFixed(1)} km/h`, {
    x: 70,
    y: height - 280,
    size: normalSize,
    font: helveticaFont,
    color: black,
  });
  
  if (stats.maxWindSpeedTime) {
    page.drawText(`Recorded at: ${format(stats.maxWindSpeedTime, 'PPp')}`, {
      x: 90,
      y: height - 300,
      size: smallSize,
      font: helveticaFont,
      color: gray,
    });
  }
  
  page.drawText(`Average Wind Speed: ${stats.avgWindSpeed.toFixed(1)} km/h`, {
    x: 70,
    y: height - 325,
    size: normalSize,
    font: helveticaFont,
    color: black,
  });
  
  // Format downtime
  const downtimeHours = Math.floor(stats.totalDowntime / 3600);
  const downtimeMinutes = Math.floor((stats.totalDowntime % 3600) / 60);
  const downtimeFormatted = downtimeHours > 0 
    ? `${downtimeHours}h ${downtimeMinutes}m` 
    : `${downtimeMinutes}m`;
  
  page.drawText(`Total Downtime: ${downtimeFormatted}`, {
    x: 70,
    y: height - 350,
    size: normalSize,
    font: helveticaFont,
    color: black,
  });
  
  // Alert state percentages
  page.drawText('Time in Each Alert State:', {
    x: 70,
    y: height - 375,
    size: normalSize,
    font: helveticaFont,
    color: black,
  });
  
  page.drawText(`Normal: ${stats.greenPercentage.toFixed(1)}%`, {
    x: 90,
    y: height - 395,
    size: normalSize,
    font: helveticaFont,
    color: green,
  });
  
  page.drawText(`Amber Alert: ${stats.amberPercentage.toFixed(1)}%`, {
    x: 90,
    y: height - 415,
    size: normalSize,
    font: helveticaFont,
    color: amber,
  });
  
  page.drawText(`Red Alert: ${stats.redPercentage.toFixed(1)}%`, {
    x: 90,
    y: height - 435,
    size: normalSize,
    font: helveticaFont,
    color: red,
  });
  
  // Data summary
  page.drawText('Wind Data Summary', {
    x: 50,
    y: height - 485,
    size: subtitleSize,
    font: helveticaBold,
    color: black,
  });
  
  // If we have wind data, list some samples
  if (windData.length > 0) {
    // Headers for data table
    page.drawText('Date', {
      x: 50,
      y: height - 515,
      size: smallSize,
      font: helveticaBold,
      color: black,
    });
    
    page.drawText('Time', {
      x: 150,
      y: height - 515,
      size: smallSize,
      font: helveticaBold,
      color: black,
    });
    
    page.drawText('Avg Wind', {
      x: 230,
      y: height - 515,
      size: smallSize,
      font: helveticaBold,
      color: black,
    });
    
    page.drawText('Max Wind', {
      x: 320,
      y: height - 515,
      size: smallSize,
      font: helveticaBold,
      color: black,
    });
    
    page.drawText('Alert', {
      x: 410,
      y: height - 515,
      size: smallSize,
      font: helveticaBold,
      color: black,
    });
    
    // Sort data by timestamp
    const sortedData = [...windData].sort(
      (a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );
    
    // Display up to 15 data points (or use pagination for more in a real app)
    const displayData = sortedData.length <= 15 
      ? sortedData 
      : [...sortedData.slice(0, 7), ...sortedData.slice(sortedData.length - 8)];
    
    let yPosition = height - 535;
    displayData.forEach((data, index) => {
      const startTime = new Date(data.intervalStart);
      
      // Determine row color based on alert state
      let rowColor = black;
      if (data.redAlertTriggered) {
        rowColor = red;
      } else if (data.amberAlertTriggered) {
        rowColor = amber;
      }
      
      // Date
      page.drawText(format(startTime, 'yyyy-MM-dd'), {
        x: 50,
        y: yPosition,
        size: smallSize,
        font: helveticaFont,
        color: rowColor,
      });
      
      // Time
      page.drawText(format(startTime, 'HH:mm'), {
        x: 150,
        y: yPosition,
        size: smallSize,
        font: helveticaFont,
        color: rowColor,
      });
      
      // Avg Wind
      page.drawText(`${data.avgWindSpeed.toFixed(1)} km/h`, {
        x: 230,
        y: yPosition,
        size: smallSize,
        font: helveticaFont,
        color: rowColor,
      });
      
      // Max Wind
      page.drawText(`${data.maxWindSpeed.toFixed(1)} km/h`, {
        x: 320,
        y: yPosition,
        size: smallSize,
        font: helveticaFont,
        color: rowColor,
      });
      
      // Alert state
      const alertText = data.redAlertTriggered 
        ? 'Red' 
        : data.amberAlertTriggered 
          ? 'Amber' 
          : 'Normal';
      
      page.drawText(alertText, {
        x: 410,
        y: yPosition,
        size: smallSize,
        font: helveticaFont,
        color: rowColor,
      });
      
      yPosition -= 20;
      
      // If we're showing partial data and this is the midpoint, add a gap
      if (sortedData.length > 15 && index === 6) {
        page.drawText('...', {
          x: 250,
          y: yPosition,
          size: smallSize,
          font: helveticaFont,
          color: gray,
        });
        yPosition -= 20;
      }
    });
  } else {
    // No data available
    page.drawText('No wind data available for the selected period', {
      x: 70,
      y: height - 515,
      size: normalSize,
      font: helveticaFont,
      color: gray,
    });
  }
  
  // Footer
  page.drawText('Generated by Wind Monitor', {
    x: width / 2 - 70,
    y: 30,
    size: smallSize,
    font: helveticaFont,
    color: gray,
  });
  
  // Serialize the PDF to bytes and download
  const pdfBytes = await pdfDoc.save();
  
  // Use file-saver to download the PDF
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const fileName = `wind-report-${device.deviceName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  saveAs(blob, fileName);
  
  return fileName;
}