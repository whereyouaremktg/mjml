#!/usr/bin/env node
/*
 * Second build step: turns MJML's compiled HTML into the Klaviyo hybrid template.
 *
 *   node build-klaviyo.js <compiled.html> <out.klaviyo.html> [config.json]
 *
 * It does five things, each asserted so a structural change in the MJML fails
 * the build loudly instead of quietly shipping a broken template:
 *   0. refuses any text arrow glyph in the body (a regressed CTA)
 *   1. swaps local image paths for Klaviyo image-library CDN URLs
 *   2. drops the Google Fonts <link> tags (Klaviyo's hybrid editor warns
 *      "Unknown node 'link'" per tag; the @import rules cover the same clients)
 *      and un-escapes &amp; inside the @import URLs (<style> is raw text)
 *   3. marks the copy cells as editable regions holding klaviyo text blocks
 *   4. converts {% unsubscribe %} to the labelled form Klaviyo requires
 *
 * Config (JSON) — defaults below match the Greedy launch layout:
 *   images:  { "assets/x.png": "https://cdn..." }   local path -> CDN URL
 *   expected: { "assets/x.png": 4 }                  occurrence counts other than 1
 *   regions:  [ { td: '<td ... exact opening tag ...>', width: 237, mode: 'p'|'mjtext' } ]
 *      mode 'p'      – wrap each <p class="..."> named in `blocks` in its own text block
 *      mode 'mjtext' – wrap the mj-text <div> that follows the td in one text block
 */
const fs = require('fs');
const path = require('path');

const [,, SRC, OUT, CFG] = process.argv;
if (!SRC || !OUT) { console.error('usage: build-klaviyo.js <compiled.html> <out.html> [config.json]'); process.exit(2); }

const defaults = {
  images: {},
  expected: { 'assets/slot-hero-collage@2x.png': 4, 'assets/arrow-head@2x.png': 2 },
  regions: [
    { td: '<td class="gr-hero-panel-inner" style="padding:16px 20px 0 20px;">', width: 237, mode: 'p',
      blocks: [['<p class="gr-hero-headline"', 'Not More</p>'], ['<p class="gr-hero-body"', 'wants better for herself.</p>']] },
    { td: '<td align="center" class="gr-editorial-pad" style="font-size:0px;padding:0 38px;word-break:break-word;">', width: 499, mode: 'mjtext' },
    { td: '<td align="justify" class="gr-body-copy gr-col-text gr-col-left" style="font-size:0px;padding:0 8px 0 0;word-break:break-word;">', width: 241, mode: 'mjtext' },
    { td: '<td align="justify" class="gr-body-copy gr-col-text gr-col-right" style="font-size:0px;padding:0 0 0 8px;word-break:break-word;">', width: 241, mode: 'mjtext' },
  ],
};
const cfg = Object.assign({}, defaults, CFG ? JSON.parse(fs.readFileSync(CFG, 'utf8')) : {});

let html = fs.readFileSync(SRC, 'utf8');
const fail = (m) => { throw new Error(m); };

// 0. arrow glyph guard -------------------------------------------------------
// A typeset arrow can never butt onto a drawn rule (own stem, bearings, baseline),
// so its presence means a CTA regressed from the chevron PNG. Fail before anything
// else - this is exactly the regression the build must not ship.
{
  const body = html.slice(html.indexOf('<body')).replace(/<!--[\s\S]*?-->/g, '');
  const glyphs = (body.match(/&#8594;|&rarr;|\u2192/g) || []).length;
  if (glyphs) fail(`${glyphs} text arrow glyph(s) in the body - CTAs must use the chevron PNG (references/email-structure.md)`);
}

// 1. images ------------------------------------------------------------------
for (const [local, cdn] of Object.entries(cfg.images)) {
  const hits = html.split(local).length - 1;
  const want = cfg.expected[local] || 1;
  if (hits !== want) fail(`${local}: expected ${want} occurrence(s), found ${hits}`);
  html = html.split(local).join(cdn);
}
const leftover = (html.match(/(?:src|background|url\(')=?["']?assets\//g) || []).length;
if (leftover) fail(`${leftover} local assets/ path(s) still present - add them to config.images`);

// 2. font tags ---------------------------------------------------------------
const links = html.match(/^\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*\n/gm) || [];
for (const l of links) html = html.replace(l, '');
const imports = html.match(/@import url\(https:\/\/fonts\.googleapis\.com[^)]*\);/g) || [];
for (const i of imports) html = html.replace(i, i.replace(/&amp;/g, '&'));
if (links.length !== imports.length) fail(`font tags: ${links.length} <link> vs ${imports.length} @import - MJML output changed shape`);

// 3. regions -----------------------------------------------------------------
const regionTag = (td, width) => td.replace(/>$/, ` data-klaviyo-region="true" data-klaviyo-region-width-pixels="${width}">`);
const replaceOnce = (needle, repl, label) => {
  if (!html.includes(needle)) fail(`anchor not found: ${label}`);
  html = html.replace(needle, repl);
};
for (const r of cfg.regions) {
  if (r.mode === 'p') {
    replaceOnce(r.td, regionTag(r.td, r.width), 'region ' + r.width);
    for (const [open, close] of r.blocks) {
      replaceOnce(open, '<div class="klaviyo-block klaviyo-text-block">' + open, 'block open ' + open);
      replaceOnce(close, close + '</div>', 'block close ' + close);
    }
  } else {
    const i = html.indexOf(r.td);
    if (i === -1) fail(`anchor not found: ${r.td.slice(0, 60)}`);
    const open = html.indexOf('<div style=', i);
    const close = html.indexOf('</td>', i);
    if (open === -1 || close === -1 || open > close) fail('malformed region at ' + r.td.slice(0, 60));
    html = html.slice(0, i) + regionTag(r.td, r.width) + html.slice(i + r.td.length, open)
         + '<div class="klaviyo-block klaviyo-text-block">' + html.slice(open, close) + '</div>' + html.slice(close);
  }
}

// 4. unsubscribe -------------------------------------------------------------
html = html.replace('{% unsubscribe %}', "{% unsubscribe 'Unsubscribe' %}");
if (!html.includes("{% unsubscribe '")) fail('no unsubscribe tag - Klaviyo will refuse to send');

fs.writeFileSync(OUT, html);
const regions = html.split('data-klaviyo-region="true"').length - 1;
const blocks = html.split('klaviyo-block').length - 1;
console.log(`wrote ${path.relative(process.cwd(), OUT)} - ${regions} regions, ${blocks} blocks, ${html.length} bytes`);
