import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { WindDataHistorical, WindAlertThreshold } from '@shared/schema';
import { DeviceWithLatestData } from '@shared/types';

// Constants for PDF styling
const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 50; // Margin in points
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const HEADER_HEIGHT = 90; // Space for header on each page

// Colors
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_GRAY = rgb(0.5, 0.5, 0.5);
const COLOR_LIGHT_GRAY = rgb(0.9, 0.9, 0.9);
const COLOR_GREEN = rgb(0.13, 0.77, 0.37);
const COLOR_AMBER = rgb(0.96, 0.62, 0.04);
const COLOR_RED = rgb(0.94, 0.27, 0.27);
const COLOR_BLUE = rgb(0.23, 0.51, 0.97);

// Font sizes
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_SUBTITLE = 16;
const FONT_SIZE_NORMAL = 11;
const FONT_SIZE_SMALL = 9;

// Table settings
const TABLE_ROW_HEIGHT = 25;
const TABLE_HEADER_HEIGHT = 30;
const MAX_ROWS_PER_PAGE = 25; // Maximum number of data rows per page
const TABLE_COLUMN_WIDTHS = {
  date: 100,
  time: 70,
  avgWind: 80,
  maxWind: 80, 
  alert: 80
};

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
 * Enhanced PDF generator with multi-page support and professional styling
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
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Try to fetch and embed the logo
    let logo = null;
    try {
      const logoResponse = await fetch('/height-tec-logo.png');
      const logoData = await logoResponse.arrayBuffer();
      logo = await pdfDoc.embedPng(new Uint8Array(logoData));
    } catch (error) {
      console.warn('Failed to load logo:', error);
      // Continue without logo
    }
    
    // Load standard fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Sort data chronologically
    const sortedData = [...windData].sort(
      (a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );
    
    // Calculate how many pages we'll need for the data table
    const totalPages = sortedData.length > 0 
      ? Math.ceil(sortedData.length / MAX_ROWS_PER_PAGE) + 1 // +1 for the first page with summary
      : 1; // Just 1 page if no data
    
    // Create first page with summary information
    const firstPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Draw report header with background
    drawPageHeader(firstPage, helveticaBold, helvetica, 1, totalPages, reportGenTime, logo);
    
    // Draw report title with background
    const titleY = PAGE_HEIGHT - HEADER_HEIGHT - 60;
    drawReportTitle(firstPage, helveticaBold, titleY);
    
    // Draw device information section
    const deviceInfoY = titleY - 80;
    drawDeviceInfo(firstPage, device, helveticaBold, helvetica, deviceInfoY, dateRange, thresholds);
    
    // Draw summary statistics section
    const statsY = deviceInfoY - 100;
    drawSummaryStats(firstPage, stats, helveticaBold, helvetica, statsY, thresholds);
    
    // Add a footer to the first page
    drawPageFooter(firstPage, helvetica, 1, totalPages);
    
    // If we have data, create additional pages with the data table
    if (sortedData.length > 0) {
      // Create the data pages
      let currentPage = 2; // First page is summary, data starts from page 2
      let remainingRows = sortedData.length;
      let rowIndex = 0;
      
      while (remainingRows > 0) {
        // Calculate how many rows to show on this page
        const rowsOnPage = Math.min(remainingRows, MAX_ROWS_PER_PAGE);
        
        // Add a new page
        const dataPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        
        // Draw the page header
        drawPageHeader(dataPage, helveticaBold, helvetica, currentPage, totalPages, reportGenTime, logo);
        
        // Draw the data table header
        const tableY = PAGE_HEIGHT - HEADER_HEIGHT - 40;
        drawTableHeader(dataPage, helveticaBold, tableY);
        
        // Draw table rows for this page
        const pageData = sortedData.slice(rowIndex, rowIndex + rowsOnPage);
        drawTableRows(dataPage, pageData, helvetica, tableY - TABLE_HEADER_HEIGHT, thresholds);
        
        // Draw the page footer
        drawPageFooter(dataPage, helvetica, currentPage, totalPages);
        
        // Update counters
        rowIndex += rowsOnPage;
        remainingRows -= rowsOnPage;
        currentPage++;
      }
    }
    
    // Serialize the PDF to bytes and download
    const pdfBytes = await pdfDoc.save();
    
    // Use file-saver to download the PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const fileName = `wind-report-${device.deviceName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    saveAs(blob, fileName);
    
    return fileName;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Draw the page header with company logo and report info
 */
function drawPageHeader(page, boldFont, regularFont, pageNumber, totalPages, reportGenTime, logo) {
  const { width, height } = page.getSize();
  
  // Draw header background
  page.drawRectangle({
    x: 0,
    y: height - HEADER_HEIGHT,
    width: width,
    height: HEADER_HEIGHT,
    color: rgb(0.95, 0.95, 0.95), // Light gray background
  });
  
  // Draw a thin line below header
  page.drawLine({
    start: { x: 0, y: height - HEADER_HEIGHT },
    end: { x: width, y: height - HEADER_HEIGHT },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8), // Medium gray line
  });
  
  // Logo positioning (left side of header)
  const logoSpace = 150; // Space for logo
  
  if (logo) {
    // Calculate logo dimensions to fit in header
    const logoHeight = HEADER_HEIGHT - 20;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    
    page.drawImage(logo, {
      x: MARGIN,
      y: height - HEADER_HEIGHT + 10,
      width: logoWidth,
      height: logoHeight
    });
  }
  
  // Draw header text (right side of header)
  page.drawText('Wind Report', {
    x: MARGIN + logoSpace,
    y: height - 35,
    size: 16,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  // Add report generation time and page count
  page.drawText(`Generated: ${format(reportGenTime, 'PPpp')}`, {
    x: MARGIN + logoSpace,
    y: height - 55,
    size: FONT_SIZE_SMALL,
    font: regularFont,
    color: COLOR_GRAY,
  });
  
  // Page number on the right side
  page.drawText(`Page ${pageNumber} of ${totalPages}`, {
    x: width - MARGIN - 80,
    y: height - 35,
    size: FONT_SIZE_SMALL,
    font: regularFont,
    color: COLOR_GRAY,
  });
}

/**
 * Draw the title section with background
 */
function drawReportTitle(page, boldFont, yPosition) {
  const { width } = page.getSize();
  
  // Draw title background
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - 10,
    width: width - (MARGIN * 2),
    height: 50,
    color: rgb(0.23, 0.51, 0.97, 0.1), // Light blue background
    borderColor: rgb(0.23, 0.51, 0.97), // Blue border
    borderWidth: 1,
  });
  
  // Draw title
  page.drawText('Wind Speed Report', {
    x: MARGIN + 20,
    y: yPosition + 15,
    size: FONT_SIZE_TITLE,
    font: boldFont,
    color: rgb(0.23, 0.51, 0.97), // Blue text
  });
}

/**
 * Draw device information section
 */
function drawDeviceInfo(page, device, boldFont, regularFont, yPosition, dateRange, thresholds) {
  const { width } = page.getSize();
  
  // Create info box
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - 80,
    width: width - (MARGIN * 2),
    height: 80,
    color: rgb(0.97, 0.97, 0.97), // Very light gray background
    borderColor: rgb(0.8, 0.8, 0.8), // Gray border
    borderWidth: 1,
  });
  
  // Device name
  page.drawText('Device:', {
    x: MARGIN + 15,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  page.drawText(device.deviceName, {
    x: MARGIN + 100,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Location
  if (device.location) {
    page.drawText('Location:', {
      x: MARGIN + 15,
      y: yPosition - 40,
      size: FONT_SIZE_NORMAL,
      font: boldFont,
      color: COLOR_BLACK,
    });
    page.drawText(device.location, {
      x: MARGIN + 100,
      y: yPosition - 40,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: COLOR_BLACK,
    });
  }
  
  // Date range
  if (dateRange.from && dateRange.to) {
    page.drawText('Period:', {
      x: MARGIN + 15,
      y: yPosition - 60,
      size: FONT_SIZE_NORMAL,
      font: boldFont,
      color: COLOR_BLACK,
    });
    page.drawText(`${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`, {
      x: MARGIN + 100,
      y: yPosition - 60,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: COLOR_BLACK,
    });
  }
  
  // Threshold information on the right side
  if (thresholds) {
    page.drawText('Alert Thresholds:', {
      x: width / 2 + 20,
      y: yPosition - 20,
      size: FONT_SIZE_NORMAL,
      font: boldFont,
      color: COLOR_BLACK,
    });
    
    // Draw amber threshold with color indicator
    page.drawRectangle({
      x: width / 2 + 20,
      y: yPosition - 35,
      width: 10,
      height: 10,
      color: COLOR_AMBER,
    });
    
    page.drawText(`Amber: ${thresholds.amberThreshold} km/h`, {
      x: width / 2 + 40,
      y: yPosition - 35,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: COLOR_BLACK,
    });
    
    // Draw red threshold with color indicator
    page.drawRectangle({
      x: width / 2 + 20,
      y: yPosition - 55,
      width: 10,
      height: 10,
      color: COLOR_RED,
    });
    
    page.drawText(`Red: ${thresholds.redThreshold} km/h`, {
      x: width / 2 + 40,
      y: yPosition - 55,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: COLOR_BLACK,
    });
  }
}

/**
 * Draw summary statistics section with graphical elements
 */
function drawSummaryStats(page, stats, boldFont, regularFont, yPosition, thresholds) {
  const { width } = page.getSize();
  
  // Section title
  page.drawText('Summary Statistics', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE_SUBTITLE,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  // Draw a horizontal line under the title
  page.drawLine({
    start: { x: MARGIN, y: yPosition - 10 },
    end: { x: width - MARGIN, y: yPosition - 10 },
    thickness: 1,
    color: COLOR_GRAY,
  });
  
  // Create two columns for the statistics
  const columnWidth = (width - (MARGIN * 2)) / 2;
  
  // Left column - Wind speeds
  
  // Max wind speed with styled box
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - 45,
    width: columnWidth - 20,
    height: 30,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });
  
  // Determine color based on threshold
  let maxWindColor = COLOR_BLACK;
  if (thresholds) {
    if (stats.maxWindSpeed > thresholds.redThreshold) {
      maxWindColor = COLOR_RED;
    } else if (stats.maxWindSpeed > thresholds.amberThreshold) {
      maxWindColor = COLOR_AMBER;
    }
  }
  
  page.drawText('Maximum Wind Speed:', {
    x: MARGIN + 10,
    y: yPosition - 30,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  page.drawText(`${stats.maxWindSpeed.toFixed(1)} km/h`, {
    x: MARGIN + 150,
    y: yPosition - 30,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: maxWindColor,
  });
  
  if (stats.maxWindSpeedTime) {
    page.drawText(`Recorded at: ${format(stats.maxWindSpeedTime, 'PPp')}`, {
      x: MARGIN + 10,
      y: yPosition - 65,
      size: FONT_SIZE_SMALL,
      font: regularFont,
      color: COLOR_GRAY,
    });
  }
  
  // Average wind speed with styled box
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - 95,
    width: columnWidth - 20,
    height: 30,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });
  
  page.drawText('Average Wind Speed:', {
    x: MARGIN + 10,
    y: yPosition - 80,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  page.drawText(`${stats.avgWindSpeed.toFixed(1)} km/h`, {
    x: MARGIN + 150,
    y: yPosition - 80,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Total downtime with styled box
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - 145,
    width: columnWidth - 20,
    height: 30,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });
  
  const downtimeHours = Math.floor(stats.totalDowntime / 3600);
  const downtimeMinutes = Math.floor((stats.totalDowntime % 3600) / 60);
  const downtimeFormatted = downtimeHours > 0 
    ? `${downtimeHours}h ${downtimeMinutes}m` 
    : `${downtimeMinutes}m`;
  
  page.drawText('Total Downtime:', {
    x: MARGIN + 10,
    y: yPosition - 130,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  page.drawText(downtimeFormatted, {
    x: MARGIN + 150,
    y: yPosition - 130,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Right column - Alert state percentages with visual bar chart
  page.drawRectangle({
    x: MARGIN + columnWidth,
    y: yPosition - 145,
    width: columnWidth - 20,
    height: 130,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });
  
  // Title for alert states
  page.drawText('Time in Each Alert State:', {
    x: MARGIN + columnWidth + 10,
    y: yPosition - 30,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  // Maximum bar width
  const maxBarWidth = columnWidth - 100;
  
  // Normal percentage with color bar
  const normalBarWidth = maxBarWidth * (stats.greenPercentage / 100);
  page.drawRectangle({
    x: MARGIN + columnWidth + 10,
    y: yPosition - 60,
    width: normalBarWidth,
    height: 15,
    color: COLOR_GREEN,
  });
  
  page.drawText(`Normal: ${stats.greenPercentage.toFixed(1)}%`, {
    x: MARGIN + columnWidth + normalBarWidth + 20,
    y: yPosition - 53,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Amber percentage with color bar
  const amberBarWidth = maxBarWidth * (stats.amberPercentage / 100);
  page.drawRectangle({
    x: MARGIN + columnWidth + 10,
    y: yPosition - 90,
    width: amberBarWidth,
    height: 15,
    color: COLOR_AMBER,
  });
  
  page.drawText(`Amber: ${stats.amberPercentage.toFixed(1)}%`, {
    x: MARGIN + columnWidth + amberBarWidth + 20,
    y: yPosition - 83,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Red percentage with color bar
  const redBarWidth = maxBarWidth * (stats.redPercentage / 100);
  page.drawRectangle({
    x: MARGIN + columnWidth + 10,
    y: yPosition - 120,
    width: redBarWidth,
    height: 15,
    color: COLOR_RED,
  });
  
  page.drawText(`Red: ${stats.redPercentage.toFixed(1)}%`, {
    x: MARGIN + columnWidth + redBarWidth + 20,
    y: yPosition - 113,
    size: FONT_SIZE_NORMAL,
    font: regularFont,
    color: COLOR_BLACK,
  });
  
  // Add a note about the data table
  page.drawText('Full Wind Data Summary on Following Pages', {
    x: MARGIN,
    y: yPosition - 180,
    size: FONT_SIZE_SUBTITLE,
    font: boldFont,
    color: COLOR_BLACK,
  });
}

/**
 * Draw the data table header
 */
function drawTableHeader(page, boldFont, yPosition) {
  const { width } = page.getSize();
  
  // Draw table title
  page.drawText('Wind Data Detail', {
    x: MARGIN,
    y: yPosition + 30,
    size: FONT_SIZE_SUBTITLE,
    font: boldFont,
    color: COLOR_BLACK,
  });
  
  // Draw table header background
  page.drawRectangle({
    x: MARGIN,
    y: yPosition - TABLE_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: TABLE_HEADER_HEIGHT,
    color: rgb(0.9, 0.9, 0.95), // Light blue-gray
    borderColor: COLOR_GRAY,
    borderWidth: 1,
  });
  
  // Calculate column positions
  let xPos = MARGIN + 15;
  
  // Draw column headers
  page.drawText('Date', {
    x: xPos,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  xPos += TABLE_COLUMN_WIDTHS.date;
  
  page.drawText('Time', {
    x: xPos,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  xPos += TABLE_COLUMN_WIDTHS.time;
  
  page.drawText('Avg Wind', {
    x: xPos,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  xPos += TABLE_COLUMN_WIDTHS.avgWind;
  
  page.drawText('Max Wind', {
    x: xPos,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
  xPos += TABLE_COLUMN_WIDTHS.maxWind;
  
  page.drawText('Alert', {
    x: xPos,
    y: yPosition - 20,
    size: FONT_SIZE_NORMAL,
    font: boldFont,
    color: COLOR_BLACK,
  });
}

/**
 * Draw table rows with alternating background
 */
function drawTableRows(page, dataRows, regularFont, startY, thresholds) {
  const { width } = page.getSize();
  
  dataRows.forEach((data, index) => {
    const rowY = startY - (index * TABLE_ROW_HEIGHT);
    const startTime = new Date(data.intervalStart);
    
    // Determine row color based on alert state
    let textColor = COLOR_BLACK;
    let bgColor = index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97);
    
    if (data.redAlertTriggered) {
      bgColor = rgb(1, 0.9, 0.9); // Light red background
      textColor = COLOR_RED;
    } else if (data.amberAlertTriggered) {
      bgColor = rgb(1, 0.95, 0.85); // Light amber background
      textColor = COLOR_AMBER;
    }
    
    // Draw row background
    page.drawRectangle({
      x: MARGIN,
      y: rowY - TABLE_ROW_HEIGHT,
      width: CONTENT_WIDTH,
      height: TABLE_ROW_HEIGHT,
      color: bgColor,
      borderColor: COLOR_GRAY,
      borderWidth: 0.5,
    });
    
    // Calculate column positions
    let xPos = MARGIN + 15;
    
    // Draw row data
    page.drawText(format(startTime, 'yyyy-MM-dd'), {
      x: xPos,
      y: rowY - 15,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: textColor,
    });
    xPos += TABLE_COLUMN_WIDTHS.date;
    
    page.drawText(format(startTime, 'HH:mm'), {
      x: xPos,
      y: rowY - 15,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: textColor,
    });
    xPos += TABLE_COLUMN_WIDTHS.time;
    
    page.drawText(`${data.avgWindSpeed.toFixed(1)} km/h`, {
      x: xPos,
      y: rowY - 15,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: textColor,
    });
    xPos += TABLE_COLUMN_WIDTHS.avgWind;
    
    page.drawText(`${data.maxWindSpeed.toFixed(1)} km/h`, {
      x: xPos,
      y: rowY - 15,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: textColor,
    });
    xPos += TABLE_COLUMN_WIDTHS.maxWind;
    
    // Alert state
    const alertText = data.redAlertTriggered 
      ? 'Red' 
      : data.amberAlertTriggered 
        ? 'Amber' 
        : 'Normal';
    
    page.drawText(alertText, {
      x: xPos,
      y: rowY - 15,
      size: FONT_SIZE_NORMAL,
      font: regularFont,
      color: textColor,
    });
  });
}

/**
 * Draw page footer with branding and page number
 */
function drawPageFooter(page, regularFont, pageNumber, totalPages) {
  const { width, height } = page.getSize();
  
  // Footer line
  page.drawLine({
    start: { x: MARGIN, y: 50 },
    end: { x: width - MARGIN, y: 50 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  
  // Company name and copyright
  page.drawText('Height-Tec Wind Monitoring System', {
    x: MARGIN,
    y: 30,
    size: FONT_SIZE_SMALL,
    font: regularFont,
    color: COLOR_GRAY,
  });
  
  // Page number
  page.drawText(`Page ${pageNumber} of ${totalPages}`, {
    x: width - MARGIN - 80,
    y: 30,
    size: FONT_SIZE_SMALL,
    font: regularFont,
    color: COLOR_GRAY,
  });
}