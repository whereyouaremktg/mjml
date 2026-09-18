#!/usr/bin/env node
/*
 * Turns the compiled greedy-launch-01.html into the Klaviyo hybrid template:
 *   1. swaps the local placeholder paths for Klaviyo CDN URLs
 *   2. marks the copy blocks as editable regions so the layout stays locked
 *      as code while text can be edited in Klaviyo's UI
 *
 *   node emails/greedy/build-klaviyo.js
 *
 * Every replacement asserts it matched, so a structural change in the MJML
 * fails the build loudly instead of silently producing a broken template.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, 'greedy-launch-01.html');
const OUT = path.join(DIR, 'greedy-launch-01.klaviyo.html');

// Klaviyo image library (account TsiEJh). The hero, inset and lifestyle are the
// real photography exported from the Figma campaign frame at 2x; the wordmarks
// are rasterised from the SVG. To swap one: upload the new file to the library,
// paste its URL here, rebuild.
const IMAGES = {
  'assets/slot-hero-collage@2x.png':      'https://d3k81ch9hvuctc.cloudfront.net/company/TsiEJh/images/72b55267-bb99-49f9-9a33-fcc711c18b8e.png',
  'assets/greedy-wordmark-white@2x.png':  'https://d3k81ch9hvuctc.cloudfront.net/company/TsiEJh/images/0658e37d-5e74-4ae8-b01c-cb0e57d5c672.png',
  'assets/greedy-wordmark-ink@2x.png':    'https://d3k81ch9hvuctc.cloudfront.net/company/TsiEJh/images/80247f8b-1a08-41ac-84de-a5c0fcc67048.png',
  'assets/slot-inset@2x.png':             'https://d3k81ch9hvuctc.cloudfront.net/company/TsiEJh/images/dc992240-90c3-4587-9ec9-53fb1607d455.png',
  'assets/slot-lifestyle@2x.png':         'https://d3k81ch9hvuctc.cloudfront.net/company/TsiEJh/images/6354ee07-50f2-4ff3-83ea-eaf5dde5229e.png',
};

let html = fs.readFileSync(SRC, 'utf8');

// --- 1. hosted image URLs -------------------------------------------------
// The hero appears four times (VML, div shorthand, table attribute, table
// shorthand); the rest once each. Assert the counts so a miss is not silent.
const EXPECTED = { 'assets/slot-hero-collage@2x.png': 4 };
for (const [local, cdn] of Object.entries(IMAGES)) {
  const hits = html.split(local).length - 1;
  const want = EXPECTED[local] || 1;
  if (hits !== want) throw new Error(`${local}: expected ${want} occurrence(s), found ${hits}`);
  html = html.split(local).join(cdn);
}

// --- 2. editable regions --------------------------------------------------
// A region is a <td> Klaviyo hands to its block editor. Regions hold only
// klaviyo-blocks - mixing raw markup in with them is unsupported - so the
// hero CTA lives in its own row outside the region, and the collage stays a
// CSS/VML background (a background cannot be an image block).
const region = (attrs, width) =>
  `<td ${attrs} data-klaviyo-region="true" data-klaviyo-region-width-pixels="${width}">`;

const replace = (needle, replacement, label) => {
  if (!html.includes(needle)) throw new Error(`anchor not found: ${label}`);
  html = html.replace(needle, replacement);
};

// hero: headline + body, each its own block. 277px panel less 2x20px padding.
replace(
  '<td class="gr-hero-panel-inner" style="padding:16px 20px 0 20px;">',
  region('class="gr-hero-panel-inner" style="padding:16px 20px 0 20px;"', 237),
  'hero panel'
);
replace('<p class="gr-hero-headline"', '<div class="klaviyo-block klaviyo-text-block"><p class="gr-hero-headline"', 'hero headline open');
replace('Not More</p>', 'Not More</p></div>', 'hero headline close');
replace('<p class="gr-hero-body"', '<div class="klaviyo-block klaviyo-text-block"><p class="gr-hero-body"', 'hero body open');
replace('wants better for herself.</p>', 'wants better for herself.</p></div>', 'hero body close');

// editorial headline and the two prose columns. MJML wraps each mj-text body
// in a styled <div>; that div becomes the block, keeping its typography.
const wrapMjText = (tdNeedle, width, label) => {
  const i = html.indexOf(tdNeedle);
  if (i === -1) throw new Error(`anchor not found: ${label}`);
  const open = html.indexOf('<div style=', i);
  const close = html.indexOf('</td>', i);
  if (open === -1 || close === -1 || open > close) throw new Error(`malformed region: ${label}`);
  const inner = html.slice(open, close);
  const wrapped = `<div class="klaviyo-block klaviyo-text-block">${inner}</div>`;
  html = html.slice(0, i) + tdNeedle.replace(/>$/, ` data-klaviyo-region="true" data-klaviyo-region-width-pixels="${width}">`)
       + html.slice(i + tdNeedle.length, open) + wrapped + html.slice(close);
};
wrapMjText('<td align="center" class="gr-editorial-pad" style="font-size:0px;padding:0 38px;word-break:break-word;">', 499, 'editorial headline');
wrapMjText('<td align="justify" class="gr-body-copy gr-col-text gr-col-left" style="font-size:0px;padding:0 8px 0 0;word-break:break-word;">', 241, 'editorial left column');
wrapMjText('<td align="justify" class="gr-body-copy gr-col-text gr-col-right" style="font-size:0px;padding:0 0 0 8px;word-break:break-word;">', 241, 'editorial right column');

// --- 3. Klaviyo requires an unsubscribe tag in the labelled form ----------
replace('{% unsubscribe %}', "{% unsubscribe 'Unsubscribe' %}", 'unsubscribe tag');

fs.writeFileSync(OUT, html);
const regions = html.split('data-klaviyo-region="true"').length - 1;
const blocks = html.split('klaviyo-block').length - 1;
console.log(`wrote ${path.relative(process.cwd(), OUT)} - ${regions} regions, ${blocks} blocks, ${html.length} bytes`);
