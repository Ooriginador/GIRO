import { test } from '@playwright/test';
import fs from 'fs';

// Debug test: injects localStorage and captures screenshot + HTML for inspection
test('capture tutorial UI snapshot', async ({ page, browserName }) => {
  await page.addInitScript(() => {
    try {
      const license = {
        key: 'TEST-LOCAL-KEY',
        info: {
          status: 'active',
          license_key: 'TEST-LOCAL-KEY',
          expires_at: '2099-01-01T00:00:00.000Z',
        },
        last_validated_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
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
      const auth = {
        employee: {
          id: 'seed-admin',
          name: 'Administrador Semente',
          role: 'ADMIN',
          pin: '8899',
        },
        currentUser: {
          id: 'seed-admin',
          name: 'Administrador Semente',
          role: 'ADMIN',
          pin: '8899',
        },
        currentSession: null,
        isAuthenticated: true,
      };
      window.localStorage.setItem('auth-storage', JSON.stringify(auth));
      // E2E bypass for license guard: include TEST-LOCAL-KEY string
      window.localStorage.setItem('giro-license', 'TEST-LOCAL-KEY');
    } catch (e) {}
  });

  await page.goto('/pdv');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const outDir = '/home/jhonslife/CICLOGIRO/GIRO/apps/desktop/test-results';
  fs.mkdirSync(outDir, { recursive: true });
  const screenshotPath = `${outDir}/tutorial-debug-${browserName}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const html = await page.content();
  fs.writeFileSync(`${outDir}/tutorial-debug.html`, html, { encoding: 'utf8' });

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
  // Include localStorage snapshot to help debugging (read from page context)
  try {
    const ls = await page.evaluate(() => {
      return {
        'giro-tutorials': window.localStorage.getItem('giro-tutorials'),
        'auth-storage': window.localStorage.getItem('auth-storage'),
        'giro-license': window.localStorage.getItem('giro-license'),
        __giro_web_mock_db__: window.localStorage.getItem('__giro_web_mock_db__'),
      };
    });
    meta.localStorage = ls;
  } catch {
    // ignore
  }

  fs.writeFileSync(`${outDir}/tutorial-debug-meta.json`, JSON.stringify(meta, null, 2));
});
