#!/usr/bin/env node
/*
 * Simple accessibility scanner using Playwright + axe-core
 * Usage: node scripts/axe-scan.js http://localhost:1420
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const URL = process.argv[2] || 'http://localhost:1420';
const OUT = process.argv[3] || 'axe-report.json';

async function waitFor(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timeout waiting for ' + url);
}

async function run() {
  console.log('Waiting for', URL);
  try {
    await waitFor(URL, 20000);
  } catch (e) {
    console.error('Server not ready:', e.message);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });

  // inject axe
  const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');
  if (!fs.existsSync(axePath)) {
    console.error('axe-core not found at', axePath);
    await browser.close();
    process.exit(1);
  }

  const axeSource = fs.readFileSync(axePath, 'utf8');
  await page.addScriptTag({ content: axeSource });

  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] },
    });
  });

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved results to', OUT);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
