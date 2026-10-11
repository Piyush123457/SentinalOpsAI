import { chromium, Browser } from 'playwright';

export interface ConsoleCaptureResult {
  url: string;
  title: string;
  healthBadge: string;
  workerStatus: string;
  queueDepth: number;
  processedCount: number;
  screenshotBase64?: string;
  timestamp: string;
}

export async function captureConsoleEvidence(consoleUrl = 'http://localhost:5001/console'): Promise<ConsoleCaptureResult> {
  const timestamp = new Date().toISOString();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    await page.goto(consoleUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#service-health-badge', { timeout: 5000 });

    const title = await page.title();
    const healthBadge = (await page.textContent('#service-health-badge'))?.trim() || 'UNKNOWN';
    const workerStatus = (await page.textContent('#worker-status-text'))?.trim() || 'UNKNOWN';
    const queueDepthText = (await page.textContent('#queue-depth-metric'))?.trim() || '0';
    const processedCountText = (await page.textContent('#processed-count-metric'))?.trim() || '0';

    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    await context.close();
    await browser.close();

    return {
      url: consoleUrl,
      title,
      healthBadge,
      workerStatus,
      queueDepth: parseInt(queueDepthText, 10) || 0,
      processedCount: parseInt(processedCountText, 10) || 0,
      screenshotBase64,
      timestamp
    };
  } catch (err: any) {
    if (browser) {
      await browser.close().catch(() => {});
    }

    // Fallback: If chromium is not yet installed in local environment, fetch DOM directly
    console.warn(`[PLAYWRIGHT] Browser automation warning: ${err.message}. Performing HTTP fallback.`);
    const res = await fetch(consoleUrl);
    const html = await res.text();

    const healthMatch = html.match(/id="service-health-badge"[^>]*>\s*([^<\s]+)/i);
    const workerMatch = html.match(/id="worker-status-text"[^>]*>\s*([^<\s]+)/i);
    const queueMatch = html.match(/id="queue-depth-metric"[^>]*>\s*(\d+)/i);
    const processedMatch = html.match(/id="processed-count-metric"[^>]*>\s*(\d+)/i);

    return {
      url: consoleUrl,
      title: 'SentinelOps - Service Console (HTTP Dom Snapshot)',
      healthBadge: healthMatch ? healthMatch[1] : 'UNKNOWN',
      workerStatus: workerMatch ? workerMatch[1] : 'UNKNOWN',
      queueDepth: queueMatch ? parseInt(queueMatch[1], 10) : 0,
      processedCount: processedMatch ? parseInt(processedMatch[1], 10) : 0,
      timestamp
    };
  }
}
