const puppeteer = require('puppeteer');

module.exports = async function generateImage(htmlUrl, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(htmlUrl, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
};