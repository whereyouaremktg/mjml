#!/usr/bin/env node
/*
 * Render the compiled email in Chromium at desktop and phone widths and report
 * the numbers that catch the layout regressions this design is prone to:
 *   - hero section height (should equal the collage height, 540 for Greedy)
 *   - editorial column width (two columns on desktop, one on phone)
 *   - CTA join: the rule's border-bottom y vs the chevron image's line y
 *     (delta must be exactly 0 or the arrow reads as broken)
 * Also writes full-page screenshots and 3x crops of every CTA.
 *
 *   node measure.js <compiled.html> <out-dir>
 *
 * Uses browser.newContext({viewport,...}) - page-level viewport options are
 * silently ignored and produce 1280x720 screenshots that look plausible.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [,, HTML, OUT] = process.argv;
if (!HTML || !OUT) { console.error('usage: measure.js <compiled.html> <out-dir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const results = {};
  for (const [name, width, mobile] of [['desktop', 800, false], ['mobile', 390, true]]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(HTML), { waitUntil: 'networkidle' });
    results[name] = await p.evaluate(() => {
      const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
      const w = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : null; };
      const ctas = [...document.querySelectorAll('img[src*="arrow-head"]')].map((img, n) => {
        const row = img.closest('tr');
        const rule = row.querySelector('td[height="8"]');
        if (!rule) return { cta: n, error: 'no 8px rule cell in this row' };
        const rb = rule.getBoundingClientRect(), ib = img.getBoundingClientRect();
        return { cta: n, ruleLineY: rb.bottom - 1, chevronLineY: ib.top + 8, delta: +((ib.top + 8) - (rb.bottom - 1)).toFixed(3) };
      });
      return { heroHeight: h('.gr-hero'), editorialColumnWidth: w('.gr-editorial-col'), documentHeight: document.documentElement.scrollHeight,
               imagesLoaded: [...document.images].filter(i => i.naturalWidth > 0).length + '/' + document.images.length, ctas };
    });
    await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    const ctx3 = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 3, isMobile: mobile, hasTouch: mobile });
    const p3 = await ctx3.newPage();
    await p3.goto('file://' + path.resolve(HTML), { waitUntil: 'networkidle' });
    const n = await p3.locator('img[src*="arrow-head"]').count();
    for (let i = 0; i < n; i++) {
      await p3.locator('img[src*="arrow-head"]').nth(i).locator('xpath=ancestor::table[2]').screenshot({ path: path.join(OUT, `${name}-cta-${i}.png`) });
    }
    await ctx3.close(); await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(results, null, 1));
  const bad = Object.values(results).flatMap(r => r.ctas).filter(c => c.error || c.delta !== 0);
  if (bad.length) { console.error('CTA join not exact:', JSON.stringify(bad)); process.exit(1); }
})();
