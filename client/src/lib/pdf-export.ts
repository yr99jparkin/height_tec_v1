import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { DeviceWithLatestData, WindDataHistorical } from '@shared/schema';

interface ExportToPdfOptions {
  reportElement: HTMLElement;
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
 * Exports the wind report to PDF format
 */
export async function exportToPdf({
  reportElement,
  device,
  dateRange,
  reportGenTime,
  stats,
  thresholds
}: ExportToPdfOptions): Promise<void> {
  try {
    // Create a new PDF document - A4 size with portrait orientation
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set font
    pdf.setFont('helvetica');
    
    // Add header
    const title = `Wind Report - ${device.deviceName}`;
    pdf.setFontSize(20);
    pdf.text(title, 20, 20);
    
    // Add report metadata
    pdf.setFontSize(10);
    pdf.text(`Generated: ${format(reportGenTime, 'PPp')}`, 20, 30);
    
    if (dateRange.from && dateRange.to) {
      pdf.text(`Period: ${format(dateRange.from, 'PPP p')} - ${format(dateRange.to, 'PPP p')}`, 20, 35);
    }
    
    // Add device information
    pdf.text(`Device ID: ${device.deviceId}`, 20, 45);
    pdf.text(`Location: ${device.longitude ? `${device.latitude}, ${device.longitude}` : 'Not specified'}`, 20, 50);
    
    // Add thresholds information
    if (thresholds) {
      pdf.text(`Amber Alert Threshold: ${thresholds.amberThreshold} km/h`, 20, 55);
      pdf.text(`Red Alert Threshold: ${thresholds.redThreshold} km/h`, 20, 60);
    }
    
    // Add summary statistics
    pdf.setFontSize(12);
    pdf.text('Summary Statistics', 20, 70);
    pdf.setFontSize(10);
    pdf.text(`Maximum Wind Speed: ${stats.maxWindSpeed.toFixed(1)} km/h`, 25, 75);
    if (stats.maxWindSpeedTime) {
      pdf.text(`at ${format(stats.maxWindSpeedTime, 'PPp')}`, 25, 80);
    }
    pdf.text(`Average Wind Speed: ${stats.avgWindSpeed.toFixed(1)} km/h`, 25, 85);
    
    const hours = Math.floor(stats.totalDowntime / 3600);
    const minutes = Math.floor((stats.totalDowntime % 3600) / 60);
    pdf.text(`Total Downtime: ${hours}h ${minutes}m`, 25, 90);
    
    pdf.text(`Alert Distribution:`, 25, 95);
    pdf.text(`Green: ${stats.greenPercentage.toFixed(1)}%`, 30, 100);
    pdf.text(`Amber: ${stats.amberPercentage.toFixed(1)}%`, 30, 105);
    pdf.text(`Red: ${stats.redPercentage.toFixed(1)}%`, 30, 110);
    
    // Convert the report element to an image
    const canvas = await html2canvas(reportElement, {
      scale: 2, // Higher scale for better quality
      logging: false,
      useCORS: true,
      allowTaint: true
    });
    
    // Calculate the available height for the content on A4 page in mm
    const contentStartY = 120; // Where the charts and tables should start after the header and stats
    const pageHeight = 297 - 20; // A4 height minus margin
    
    // Calculate the required height for the content
    const contentHeightRatio = canvas.height / canvas.width;
    const availableWidth = 210 - 40; // A4 width minus margins
    const requiredHeight = availableWidth * contentHeightRatio;
    
    // If the content is too large, split it into multiple images
    const maxImageHeight = pageHeight - contentStartY;
    
    if (requiredHeight <= maxImageHeight) {
      // Content fits on first page after the header
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 20, contentStartY, availableWidth, requiredHeight);
    } else {
      // Content is too large, split into multiple parts
      const scaleFactor = canvas.width / availableWidth;
      const pixelsPerPage = Math.floor(maxImageHeight * scaleFactor);
      let srcY = 0;
      let destY = contentStartY;
      let page = 1;
      
      while (srcY < canvas.height) {
        // If not the first page, start from the top
        if (srcY > 0) {
          pdf.addPage();
          destY = 20; // Start from the top of the new page with a small margin
          
          // Add page number
          pdf.setFontSize(8);
          pdf.text(`Page ${page}`, 190, 287);
        }
        
        const remainingHeight = canvas.height - srcY;
        const currentPageHeight = Math.min(pixelsPerPage, remainingHeight);
        const currentDestHeight = currentPageHeight / scaleFactor;
        
        // Create a temporary canvas for this segment
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = currentPageHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.drawImage(
            canvas, 
            0, srcY, canvas.width, currentPageHeight, 
            0, 0, tempCanvas.width, tempCanvas.height
          );
          
          const imgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 20, destY, availableWidth, currentDestHeight);
        }
        
        srcY += currentPageHeight;
        page++;
      }
    }
    
    // Add footer with timestamp on all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Generated on ${format(new Date(), 'PPpp')}`, 20, 287);
      pdf.text(`Page ${i} of ${totalPages}`, 180, 287);
    }
    
    // Save the PDF
    pdf.save(`wind-report-${device.deviceName}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}