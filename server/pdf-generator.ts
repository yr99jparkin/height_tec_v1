import puppeteer from 'puppeteer';
import chromium from 'chrome-aws-lambda';
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
    
    log('Launching browser for PDF generation using chrome-aws-lambda', 'pdf');
    
    // Use chrome-aws-lambda which is better suited for serverless environments
    let browser;
    try {
      // Try to use chrome-aws-lambda first (better for Replit)
      const executablePath = await chromium.executablePath;
      
      if (executablePath) {
        browser = await puppeteer.launch({
          executablePath,
          headless: true,
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          ignoreHTTPSErrors: true,
        });
        log('Successfully launched browser using chrome-aws-lambda', 'pdf');
      } else {
        // Fall back to regular puppeteer
        log('Falling back to regular puppeteer', 'pdf');
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--single-process',
          ],
        });
      }
    } catch (browserError) {
      log(`Error launching browser: ${browserError}`, 'pdf');
      console.error('Browser launch error:', browserError);
      throw new Error(`Failed to launch browser: ${browserError.message}`);
    }
    
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
    console.error('PDF Generation Error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}` });
  }
}

/**
 * API handler for PDF generation from the client
 * This function is designed to receive HTML content and generate a PDF
 */
export const handlePdfGeneration = async (req: Request, res: Response) => {
  try {
    log('PDF generation handler called', 'pdf');
    console.log('PDF Generation Request Body:', req.body);
    console.log('PDF Generation Request Content-Type:', req.get('Content-Type'));
    
    // Check for multipart form data
    if (req.is('multipart/form-data')) {
      log('Request is multipart/form-data', 'pdf');
      if (!req.body.html) {
        log('HTML content missing in multipart form data', 'pdf');
        return res.status(400).json({ error: 'HTML content is required in form data' });
      }
      
      return generatePdf(req, res);
    }
    
    // If the content is JSON
    if (req.is('application/json')) {
      log('Request is application/json', 'pdf');
      if (!req.body.html) {
        log('HTML content missing in JSON body', 'pdf');
        return res.status(400).json({ error: 'HTML content is required in JSON body' });
      }
      
      return generatePdf(req, res);
    }
    
    // Handle plain text content type
    if (req.is('text/plain') || req.is('application/x-www-form-urlencoded')) {
      log('Request is plain text or form-urlencoded', 'pdf');
      const html = req.body.html || req.body;
      
      if (!html) {
        log('HTML content missing in plain text', 'pdf');
        return res.status(400).json({ error: 'HTML content is required' });
      }
      
      // Create a modified request object with the correct body format
      const modifiedReq = { ...req, body: { html: html, filename: req.body.filename || 'report.pdf' } };
      return generatePdf(modifiedReq as Request, res);
    }
    
    // If neither multipart nor JSON
    log(`Unsupported media type: ${req.get('Content-Type')}`, 'pdf');
    res.status(415).json({ 
      error: 'Unsupported media type. Please send HTML content as multipart/form-data or application/json',
      contentType: req.get('Content-Type')
    });
  } catch (error) {
    console.error('Error in PDF generation handler:', error);
    log(`Error in PDF generation handler: ${error}`, 'pdf');
    res.status(500).json({ error: `PDF generation handler error: ${error instanceof Error ? error.message : String(error)}` });
  }
};