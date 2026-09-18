#!/usr/bin/env node
/*
 * Generate placeholder slot images in the brand's slot grey, labelled with the
 * slot name and export size, at 2x. The hero placeholder reproduces the collage
 * geometry so the designer can see exactly what the composite must contain.
 *
 *   node placeholders.js <out-dir> [slots.json]
 * slots.json: [{ name, w, h, html? }]  (html overrides the default grey box)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [,, OUT, CFG] = process.argv;
if (!OUT) { console.error('usage: placeholders.js <out-dir> [slots.json]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const L = `font-family:monospace;font-size:11px;letter-spacing:1px;color:#827A76;text-align:center;line-height:1.6`;
const box = (t, w, h) => `<div style="width:${w}px;height:${h}px;background:#C9C3BE;display:flex;align-items:center;justify-content:center;"><div style="${L}">${t}</div></div>`;
const defaults = [
  { name: 'slot-hero-collage', w: 575, h: 540, html: `<div style="position:relative;width:575px;height:540px;background:#fff;">
      <div style="position:absolute;left:0;top:0;width:183px;height:282px;background:#C9C3BE;display:flex;align-items:center;justify-content:center;"><div style="${L}">HERO L<br>bleeds left</div></div>
      <div style="position:absolute;left:233px;top:0;width:342px;height:490px;background:#C9C3BE;display:flex;align-items:center;justify-content:center;"><div style="${L}">HERO R</div></div></div>` },
  { name: 'slot-inset', w: 129, h: 123 },
  { name: 'slot-lifestyle', w: 575, h: 304 },
];
const slots = CFG ? JSON.parse(fs.readFileSync(CFG, 'utf8')) : defaults;
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  for (const s of slots) {
    const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.setContent(`<html><body style="margin:0">${s.html || box(`${s.name.toUpperCase()}<br>${s.w}&times;${s.h} (@2x ${s.w*2}&times;${s.h*2})`, s.w, s.h)}</body></html>`);
    await p.screenshot({ path: path.join(OUT, `${s.name}@2x.png`) });
    await ctx.close();
    console.log(`${s.name}@2x.png ${s.w*2}x${s.h*2}`);
  }
  await b.close();
})();
