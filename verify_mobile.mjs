import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const OUT = 'C:/Users/Dell/beoneofus/verify_screenshots';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const mobile = { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: mobile, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();

  // 1. Landing page
  await page.goto('https://www.beoneofus.work', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/01_landing.png`, fullPage: false });
  console.log('1. Landing page captured');

  // 2. Auth page
  await page.goto('https://www.beoneofus.work/auth', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/02_auth.png`, fullPage: false });
  console.log('2. Auth page captured');

  // 3. Navigate to dash (will redirect to auth if not logged in)
  await page.goto('https://www.beoneofus.work/dash/messages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/03_messages_or_redirect.png`, fullPage: false });
  const url3 = page.url();
  console.log('3. Messages page URL:', url3);

  // 4. Check bottom nav presence on messages page
  const bottomNavVisible = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return 'no nav found';
    const rect = nav.getBoundingClientRect();
    const style = window.getComputedStyle(nav);
    return { display: style.display, visibility: style.visibility, bottom: rect.bottom, height: rect.height };
  });
  console.log('4. Bottom nav state:', JSON.stringify(bottomNavVisible));

  // 5. Check if inbox panel and chat area exist
  const layout = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll('div')).filter(d => {
      const s = window.getComputedStyle(d);
      return s.display === 'flex' && s.flexDirection === 'column' && d.offsetWidth > 200;
    });
    return panels.slice(0, 5).map(p => ({
      width: p.offsetWidth,
      height: p.offsetHeight,
      classes: p.className.substring(0, 60)
    }));
  });
  console.log('5. Flex column panels:', JSON.stringify(layout, null, 2));

  await browser.close();
  console.log('\nDone. Screenshots saved to:', OUT);
})();
