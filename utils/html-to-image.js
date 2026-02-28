const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async function generateImage(htmlUrl, outputPath) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.goto(htmlUrl, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
};