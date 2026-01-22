import { test } from '@playwright/test';
import fs from 'fs';

// Debug test: injects localStorage and captures screenshot + HTML for inspection
test('capture tutorial UI snapshot', async ({ page, browserName }) => {
  // Seed license and web mock DB so app shows tutorials for seeded admin
  await page.addInitScript(() => {
    try {
      const license = {
        licenseKey: 'TEST-LOCAL-KEY',
        licenseInfo: { status: 'active', expires_at: '2099-01-01T00:00:00.000Z', metadata: {} },
        lastValidation: new Date().toISOString(),
      };
      window.localStorage.setItem('giro-license', JSON.stringify(license));

      const db = {
        employees: [
          {
            id: 'seed-admin',
            name: 'Administrador Semente',
            role: 'ADMIN',
            pin: '8899',
            isActive: true,
          },
        ],
        currentCashSession: null,
        cashSessionHistory: [],
      };
      window.localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
    } catch (e) {
      // ignore
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Allow animations / UI to settle
  await page.waitForTimeout(1000);

  // Create output dir
  fs.mkdirSync('test-results', { recursive: true });

  const screenshotPath = `test-results/tutorial-debug-${browserName}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const html = await page.content();
  fs.writeFileSync('test-results/tutorial-debug.html', html, { encoding: 'utf8' });

  // Try to probe common tutorial elements
  const meta: Record<string, unknown> = {};
  try {
    const hasSpotlight = !!(await page.$('.spotlight'));
    meta.spotlight = hasSpotlight;
  } catch (e) {
    meta.spotlight = false;
  }

  try {
    const sr = await page.$('div[role="status"].sr-only');
    meta.screenReaderAnnouncement = !!sr;
  } catch {
    meta.screenReaderAnnouncement = false;
  }

  fs.writeFileSync('test-results/tutorial-debug-meta.json', JSON.stringify(meta, null, 2));
});
