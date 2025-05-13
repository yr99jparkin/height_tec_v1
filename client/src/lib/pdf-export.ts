import { format } from 'date-fns';
import { DeviceWithLatestData } from '@shared/types';
import { WindDataHistorical } from '@shared/schema';

interface ExportToPdfOptions {
  device: DeviceWithLatestData;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  reportGenTime: Date;
  stats: {
    maxWindSpeed: number;
    maxWindSpeedTime: Date | null;
    avgWindSpeed: number;
    totalDowntime: number;
    greenPercentage: number;
    amberPercentage: number;
    redPercentage: number;
  };
  thresholds?: {
    amberThreshold: number;
    redThreshold: number;
  };
}

/**
 * Creates the HTML content for the PDF report
 */
function createReportHtml({
  device,
  dateRange,
  reportGenTime,
  stats,
  thresholds
}: ExportToPdfOptions): string {
  const title = `Wind Report - ${device.deviceName}`;
  const generatedText = `Generated: ${format(reportGenTime, 'PPp')}`;
  const periodText = dateRange.from && dateRange.to
    ? `Period: ${format(dateRange.from, 'PPP p')} - ${format(dateRange.to, 'PPP p')}`
    : '';
  
  const hours = Math.floor(stats.totalDowntime / 3600);
  const minutes = Math.floor((stats.totalDowntime % 3600) / 60);
  
  // Create PDF styling with CSS
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          margin-bottom: 20px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        .metadata {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        .device-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #f8f8f8;
          border-radius: 5px;
        }
        .device-info p {
          margin: 5px 0;
          font-size: 12px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin: 15px 0 10px 0;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-box {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
        }
        .stat-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .stat-subtext {
          font-size: 10px;
          color: #888;
        }
        .thresholds {
          margin: 10px 0;
          font-size: 12px;
        }
        .alert-distribution {
          margin-top: 15px;
        }
        .percentage-bar {
          height: 20px;
          width: 100%;
          background-color: #eee;
          margin-top: 5px;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
        }
        .green-segment {
          height: 100%;
          background-color: #4caf50;
        }
        .amber-segment {
          height: 100%;
          background-color: #ff9800;
        }
        .red-segment {
          height: 100%;
          background-color: #f44336;
        }
        .footer {
          margin-top: 30px;
          font-size: 10px;
          color: #888;
          text-align: center;
        }
        @page {
          margin: 15mm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="metadata">${generatedText}</div>
        ${periodText ? `<div class="metadata">${periodText}</div>` : ''}
      </div>
      
      <div class="device-info">
        <p><strong>Device ID:</strong> ${device.deviceId}</p>
        <p><strong>Location:</strong> ${device.location || 'Not specified'}</p>
        ${device.longitude ? `<p><strong>Coordinates:</strong> ${device.latitude}, ${device.longitude}</p>` : ''}
        ${thresholds ? `
          <div class="thresholds">
            <p><strong>Alert Thresholds:</strong></p>
            <p>Amber Alert: ≥ ${thresholds.amberThreshold} km/h</p>
            <p>Red Alert: ≥ ${thresholds.redThreshold} km/h</p>
          </div>
        ` : ''}
      </div>
      
      <div class="section-title">Summary Statistics</div>
      
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-label">Maximum Wind Speed</div>
          <div class="stat-value">${stats.maxWindSpeed.toFixed(1)} km/h</div>
          ${stats.maxWindSpeedTime ? 
            `<div class="stat-subtext">at ${format(stats.maxWindSpeedTime, 'PPp')}</div>` : ''}
        </div>
        
        <div class="stat-box">
          <div class="stat-label">Average Wind Speed</div>
          <div class="stat-value">${stats.avgWindSpeed.toFixed(1)} km/h</div>
        </div>
        
        <div class="stat-box">
          <div class="stat-label">Total Downtime</div>
          <div class="stat-value">${hours}h ${minutes}m</div>
        </div>
      </div>
      
      <div class="alert-distribution">
        <div class="stat-label">Alert Distribution</div>
        <div class="percentage-bar">
          <div class="green-segment" style="width: ${stats.greenPercentage}%;"></div>
          <div class="amber-segment" style="width: ${stats.amberPercentage}%;"></div>
          <div class="red-segment" style="width: ${stats.redPercentage}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px;">
          <div>Green: ${stats.greenPercentage.toFixed(1)}%</div>
          <div>Amber: ${stats.amberPercentage.toFixed(1)}%</div>
          <div>Red: ${stats.redPercentage.toFixed(1)}%</div>
        </div>
      </div>
      
      <div class="footer">
        Generated on ${format(new Date(), 'PPpp')} | Wind Monitoring System Report
      </div>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Exports the wind report to PDF format using Puppeteer on the server side
 */
export async function exportToPdf(options: ExportToPdfOptions): Promise<void> {
  try {
    const { device } = options;
    const filename = `wind-report-${device.deviceName}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    
    // Create the HTML content for the report
    const reportHtml = createReportHtml(options);
    
    // Send request to the server to generate PDF using JSON
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: reportHtml,
        filename: filename,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate PDF: ${errorText}`);
    }
    
    // Get the PDF as a blob
    const pdfBlob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}