# Photography: Figma → Klaviyo without touching the bytes

The sandbox can't reach `figma.com` (CONNECT 403 from the egress proxy) or Klaviyo's CloudFront CDN. Don't `curl` — it silently produces empty files (`-s` hides the error; check sizes). Instead, every image moves server-to-server:

1. `download_assets` on the slot's node in Figma → short-lived export URL
2. `upload_image_from_url` in Klaviyo with that URL → permanent CDN URL
3. verify: the `size` Klaviyo reports equals the `sizeBytes` Figma reported

Do step 2 within a few minutes of step 1; the URLs expire.

## Finding the slots

Fetch a known frame by its node id (`get_metadata` with `nodeId`), not by walking the page: `get_metadata` on the page lists top-level frames only, and a campaign frame nested inside a section or another frame will be missing from that listing while fetching it directly works fine. One run concluded the Launch 01 frame "wasn't in the file" for exactly this reason. Known ids live in `greedy-design-system.md`; when the user gives a URL, the `node-id=491-16345` query param is the id with `-` → `:`.


`get_metadata` on the frame lists every node with x/y/w/h. Image slots are the `rounded-rectangle` (or `rectangle`) nodes at the artboard's photo positions — for Greedy: `Rectangle 5` (hero L), `Rectangle 6` (hero R), `Rectangle 8` (inset), `Rectangle 9` (lifestyle). `download_assets` on the *frame* returns every raw fill in the subtree (two per rectangle — Figma keeps the source and the crop), which is ambiguous; call it per rectangle node instead so mapping is certain. Prefer the node's **export** over its raw images: the export has Figma's crop applied.

Always `defaultFormat: "png"`, `defaultScale: 2`.

## Slots that need geometry

The email's content area is 575 wide, starting 25px in from the artboard's left edge (24px gutter + 1px rail). Two slots have to account for that:

- **Hero composite** — one 575×540 image: left card at x=−25 (so it bleeds the gutter and shows 0…183), right card at x=233, both at y=0, on white.
- **Lifestyle** — the 600-wide photo at x=−25, 575×304.

Build them *in Figma* with `use_figma` (load the `figma-use` guidance first — `skill://figma/figma-use/SKILL.md`):

```js
const page = figma.currentPage;
const L = await figma.getNodeByIdAsync('435:5769'), R = await figma.getNodeByIdAsync('435:5770');
const right = Math.max(...page.children.map(n => n.x + n.width));   // park clear of the design
const hero = figma.createFrame();
hero.name = '_email-export hero composite 575x540 (TEMPORARY - safe to delete)';
hero.resize(575, 540); hero.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; hero.clipsContent = true;
page.appendChild(hero); hero.x = Math.ceil(right) + 200; hero.y = 0;
const l = L.clone(); hero.appendChild(l); l.x = -25; l.y = 0;
const r = R.clone(); hero.appendChild(r); r.x = 233; r.y = 0;
await hero.screenshot();                                               // eyeball it inline
return { createdNodeIds: [hero.id, l.id, r.id], heroId: hero.id };
```

Then `download_assets` on `heroId` at 2x → upload to Klaviyo → and **delete the frame**:

```js
for (const id of ['<heroId>', '<lifeId>']) { const n = await figma.getNodeByIdAsync(id);
  if (n && n.name.includes('TEMPORARY')) n.remove(); }
return { leftovers: figma.currentPage.query('FRAME[name^=_email-export]').values(['id','name']) };
```

Leave the file exactly as you found it. Name temp frames loudly so anyone who sees one mid-run knows what it is.

The inset needs no geometry: export the rectangle itself.

## Generated assets: data URIs

Wordmarks (rasterised from the SVG in the export, since email can't render inline SVG) and the CTA chevron are small PNGs you make locally. `scripts/rasterize.js` prints each as a `data:image/png;base64,…` string; `upload_image_from_url` takes that directly (≤ 5 MB). The Greedy ones are already in `assets/` and in the Greedy Klaviyo library — check `get_images` before re-uploading.

## Slot sizes for Greedy (575-wide content)

| Slot | 1x | 2x export | Note |
|---|---|---|---|
| Hero collage | 575 × 540 | 1150 × 1080 | composite; section background, emitted 4× in the HTML |
| Inset | 129 × 123 | 258 × 246 | |
| Lifestyle | 575 × 304 | 1150 × 608 | cropped 25px on the left |
| Wordmark white | 104 × 23 | 208 × 46 | `assets/` |
| Wordmark ink | 69 × 15 | 138 × 30 | `assets/` |
| CTA chevron | 8 × 16 | 16 × 32 | `assets/` |

## Placeholders

Before photography exists, `scripts/placeholders.js <dir>` writes slot-grey PNGs at 2x with the geometry printed on them (the hero one draws the two cards so the designer sees what the composite must contain). Reference them as `assets/…` in the MJML; the Klaviyo build swaps them for CDN URLs.
