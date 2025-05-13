import puppeteer from 'puppeteer';
import { Request, Response } from 'express';
import { log } from './logger';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Generate a PDF from HTML content using Puppeteer
 * This function is used by the PDF generation API endpoint
 */
export async function generatePdf(req: Request, res: Response) {
  try {
    const { html, filename } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Set a default filename if not provided
    const outputFilename = filename || `report-${Date.now()}.pdf`;
    
    // Create a temporary file to store the HTML
    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `${Date.now()}.html`);
    
    // Write the HTML to the temporary file
    fs.writeFileSync(tempHtmlPath, html);
    
    log(`Generating PDF from HTML in ${tempHtmlPath}`, 'pdf');
    
    // Launch a new browser instance
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Load the HTML content from the temp file to avoid issues with large strings
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
    
    // Set PDF options for A4 size
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });
    
    // Close the browser
    await browser.close();
    
    // Clean up the temporary HTML file
    try {
      fs.unlinkSync(tempHtmlPath);
    } catch (err) {
      log(`Error removing temporary HTML file: ${err}`, 'pdf');
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
    
    log(`PDF generated successfully: ${outputFilename}`, 'pdf');
  } catch (error) {
    log(`Error generating PDF: ${error}`, 'pdf');
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

/**
 * API handler for PDF generation from the client
 * This function is designed to receive HTML content and generate a PDF
 */
export const handlePdfGeneration = async (req: Request, res: Response) => {
  // Check for multipart form data
  if (req.is('multipart/form-data')) {
    if (!req.body.html) {
      return res.status(400).json({ error: 'HTML content is required in form data' });
    }
    
    return generatePdf(req, res);
  }
  
  // If the content is JSON
  if (req.is('application/json')) {
    if (!req.body.html) {
      return res.status(400).json({ error: 'HTML content is required in JSON body' });
    }
    
    return generatePdf(req, res);
  }
  
  // If neither multipart nor JSON
  res.status(415).json({ error: 'Unsupported media type. Please send HTML content as multipart/form-data or application/json' });
};