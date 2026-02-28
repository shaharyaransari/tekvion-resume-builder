const puppeteer = require('puppeteer');
const fs = require('fs/promises');

module.exports = async function generatePDF(htmlUrl, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(htmlUrl, { waitUntil: 'networkidle0' });

  // Override @page margins and body background so the PDF output
  // matches the HTML — the template's .page padding handles spacing.
  await page.addStyleTag({
    content: `
      @page { margin: 0 !important; }
      body { background: #fff !important; }
      .page {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    `
  });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
};