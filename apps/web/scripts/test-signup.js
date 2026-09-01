const { chromium } = require('playwright');

const UNIQUE_EMAIL = `testuser_${Date.now()}@mailnull.com`;
console.log('Testing with email:', UNIQUE_EMAIL);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Capture all console errors and network failures
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text());
  });
  page.on('requestfailed', req => {
    console.log('[request failed]', req.url(), req.failure()?.errorText);
  });

  // ── Step 0: load + click Create one ─────────────────────────────────────
  await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.click('text=Create one');
  await page.waitForTimeout(800);

  // ── Step 1: enter unique email, click Continue ───────────────────────────
  await page.fill('input[type=email]', UNIQUE_EMAIL);
  await page.click('button[type=submit]');
  await page.waitForTimeout(800);

  // ── Step 2: fill username, password, confirm ─────────────────────────────
  const uid = `user${Date.now().toString().slice(-6)}`;
  await page.fill('#auth-username', uid);
  // wait for debounce + supabase query
  await page.waitForFunction(() => !document.querySelector('svg.animate-spin'), { timeout: 8000 });
  await page.fill('#auth-password', 'TestPass123!');
  await page.fill('#confirm-password', 'TestPass123!');
  await page.waitForTimeout(400);

  const hints = await page.locator('p.text-xs').allTextContents().catch(() => []);
  console.log('hints (strength/username):', JSON.stringify(hints));

  // ── Submit ────────────────────────────────────────────────────────────────
  console.log('Submitting sign-up...');
  await page.click('button[type=submit]');

  // wait for either success card or error banner
  await page.waitForFunction(
    () =>
      document.querySelector('p.text-xl') ||
      document.querySelector('[class*="text-red-6"]'),
    { timeout: 10000 }
  ).catch(() => {});

  await page.screenshot({ path: 'screenshots/signup-result.png', fullPage: true });

  const resultH = await page.locator('p.text-xl').textContent().catch(() => null);
  const errTexts = await page.locator('[class*="text-red"]').allTextContents().catch(() => []);
  console.log('Result heading:', resultH);
  console.log('Errors:', JSON.stringify(errTexts.filter(Boolean)));

  await browser.close();
})();
