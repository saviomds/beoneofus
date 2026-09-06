// Platform render/smoke audit.
// For every route it: loads the page, captures console errors + uncaught
// exceptions, then asserts the page did not crash (no Next error overlay, no
// pageerror) and is not blank. Protected routes are expected to redirect to
// /auth when unauthenticated — that is treated as a healthy outcome, not a fail.
import { test, expect } from '@playwright/test';

// Static / public routes that should render on their own.
const PUBLIC_ROUTES = [
  '/', '/business', '/blog', '/community',
  '/community/design-creativity',
  '/community/finance-business', '/community/founders-startups',
  '/community/marketing-growth', '/community/tech-engineering',
  '/sponsors', '/for-institutions', '/vision', '/growth', '/roadmap',
  '/how_it_works', '/quick-start', '/resources', '/privacy', '/terms',
  '/maintenance', '/offline', '/contents',
  '/auth', '/login', '/signup', '/reset-password', '/onboarding',
  '/docs',
  '/organizations', '/market', '/shop', '/opportunities',
];

// Routes behind auth — unauthenticated they should redirect to /auth (or render
// their own gate). We only assert they don't crash.
const PROTECTED_ROUTES = [
  '/dash', '/dashboard', '/founder-dashboard', '/member-dashboard',
  '/sponsor-dashboard', '/admin/verification', '/orders',
];

// Ignore noise that isn't an app defect (favicon/manifest 404s, SW, HMR,
// third-party analytics, browser extension chatter).
const IGNORE = [
  /favicon/i, /manifest/i, /sw\.js/i, /service worker/i, /workbox/i,
  /\[HMR\]/i, /hot-update/i, /Download the React DevTools/i,
  /ERR_INTERNET_DISCONNECTED/i, /net::ERR_/i,
];
const isNoise = (t) => IGNORE.some((re) => re.test(t));

function attachCollectors(page, bag) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m.text())) bag.consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => {
    if (!isNoise(String(e))) bag.pageErrors.push(String(e.message || e));
  });
}

async function assertRendered(page, route, bag, { allowRedirect }) {
  // Next.js dev error overlay (crash during render / RSC error).
  const overlay = page.locator('nextjs-portal, [data-nextjs-dialog], #nextjs__container_errors');
  expect(await overlay.count(), `Next error overlay present on ${route}`).toBe(0);

  // Uncaught exceptions during load = a crash.
  expect(bag.pageErrors, `Uncaught exception(s) on ${route}:\n${bag.pageErrors.join('\n')}`).toEqual([]);

  // Not a blank/white screen: the <body> has real text or interactive nodes.
  const textLen = (await page.locator('body').innerText().catch(() => '')).trim().length;
  const nodes = await page.locator('body *').count();
  expect(textLen > 0 || nodes > 3, `Blank page at ${route} (textLen=${textLen}, nodes=${nodes})`).toBeTruthy();
}

test.describe('public routes render', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route}`, async ({ page }) => {
      const bag = { consoleErrors: [], pageErrors: [] };
      attachCollectors(page, bag);
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // A public route should not itself return a 5xx.
      expect((resp?.status() ?? 0) < 500, `${route} returned ${resp?.status()}`).toBeTruthy();
      await page.waitForLoadState('networkidle').catch(() => {});
      await assertRendered(page, route, bag, { allowRedirect: false });
      // Console errors are reported but don't fail the run (many are benign
      // network/telemetry). They surface in the test output for triage.
      if (bag.consoleErrors.length) {
        console.log(`  ⚠ console errors on ${route}:\n   - ${bag.consoleErrors.join('\n   - ')}`);
      }
    });
  }
});

test.describe('protected routes do not crash (redirect or gate)', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`GET ${route}`, async ({ page }) => {
      const bag = { consoleErrors: [], pageErrors: [] };
      attachCollectors(page, bag);
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect((resp?.status() ?? 0) < 500, `${route} returned ${resp?.status()}`).toBeTruthy();
      await page.waitForLoadState('networkidle').catch(() => {});
      await assertRendered(page, route, bag, { allowRedirect: true });
    });
  }
});
