import { test } from '@playwright/test';
import fs from 'fs';

// Debug test: injects localStorage and captures screenshot + HTML for inspection
test('capture tutorial UI snapshot', async ({ page, browserName }) => {
  await page.addInitScript(() => {
    try {
      const license = {
        state: {
          licenseKey: 'TEST-LOCAL-KEY',
          licenseInfo: { status: 'active', expires_at: '2099-01-01T00:00:00.000Z', metadata: {} },
          lastValidation: new Date().toISOString(),
        },
        version: 1,
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
      // seed a simple tutorial state so the UI can render the spotlight
      const tutorials = {
        version: 1,
        items: [{ id: 'tut-1', title: 'Welcome', completed: false, steps: [1, 2, 3] }],
        current: { tutorialId: 'tut-1', stepIndex: 0 },
      };
      window.localStorage.setItem('giro-tutorials', JSON.stringify(tutorials));
      // E2E bypass for license guard: include TEST-LOCAL-KEY string
      // also set global bypass flag recognized by LicenseGuard
      try {
        (globalThis as unknown as Record<string, unknown>).__E2E_BYPASS_LICENSE = true;
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  });

  // navigate directly to tutorials page to force tutorial overlay
  await page.goto('/tutorials');
  await page.waitForLoadState('networkidle');
  // In case the app clears or overwrites pre-init localStorage, set values again and reload
  await page.evaluate(() => {
    try {
      const tutorials = {
        progress: {
          'tut-1': {
            tutorialId: 'tut-1',
            status: 'in-progress',
            currentStep: 0,
            completedSteps: [],
          },
        },
        settings: { enabled: true, showWelcomeOnFirstLogin: true, screenReaderAnnouncements: true },
      };
      window.localStorage.setItem('giro-tutorials', JSON.stringify(tutorials));
      const license = {
        state: {
          licenseKey: 'TEST-LOCAL-KEY',
          licenseInfo: { status: 'active' },
          lastValidation: new Date().toISOString(),
        },
        version: 1,
      };
      window.localStorage.setItem('giro-license', JSON.stringify(license));
      const auth = {
        employee: { id: 'seed-admin', name: 'Administrador Semente', role: 'ADMIN', pin: '8899' },
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
      // ensure bypass flag remains
      try {
        (globalThis as unknown as Record<string, unknown>).__E2E_BYPASS_LICENSE = true;
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Click the first "Iniciar" button to start the tutorial and show the spotlight
  try {
    const startBtn = page.locator('button:has-text("Iniciar")').first();
    if (await startBtn.count()) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    /* ignore */
  }

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
  } catch {
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
