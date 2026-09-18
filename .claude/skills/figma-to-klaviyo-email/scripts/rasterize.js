#!/usr/bin/env node
/*
 * Rasterise an SVG (file or inline string) to a transparent PNG at an exact
 * pixel size. Used for the wordmarks (email can't render inline SVG) and the
 * CTA chevron. Prints the PNG as a data URI too, which Klaviyo's
 * upload_image_from_url accepts directly - handy when the sandbox can't host
 * files anywhere Klaviyo can fetch.
 *
 *   node rasterize.js <in.svg> <out.png> <widthPx> <heightPx>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const [,, IN, OUT, W, H] = process.argv;
if (!IN || !OUT || !W || !H) { console.error('usage: rasterize.js <in.svg> <out.png> <w> <h>'); process.exit(2); }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async () => {
  let svg = fs.readFileSync(IN, 'utf8');
  svg = svg.replace(/<svg([^>]*)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*)\sheight="[^"]*"/, '<svg$1')
           .replace('<svg', `<svg width="${W}" height="${H}"`);
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path: OUT, omitBackground: true });
  await b.close();
  const buf = fs.readFileSync(OUT);
  console.log(`${OUT} ${W}x${H} ${buf.length} bytes`);
  console.log('data:image/png;base64,' + buf.toString('base64'));
})();
