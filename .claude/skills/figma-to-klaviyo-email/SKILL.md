---
name: figma-to-klaviyo-email
description: Turn a Figma email design (a Greedy campaign frame, or any HTML.to.design export) into a responsive MJML email and ship it into Klaviyo as a hybrid template with the real photography, arrow CTAs, live links and editable copy. Use this whenever the user wants an email design "made responsive", "into Klaviyo", "ready to send", asks how to get the images out of Figma and into the email, shares a Figma frame link for an email, or says anything like "build the Greedy email", "make this work in Klaviyo", or "the arrow / images / links are wrong in Klaviyo" — even if they don't mention MJML, Figma or Klaviyo by name. Also use it to update an existing Klaviyo template when the Figma design, copy, photography or links change.
---

# Figma → MJML → Klaviyo

You are taking an email that was *designed* — usually in Figma, exported by HTML.to.design as an absolutely-positioned artboard — and making it *send*: responsive, Outlook-safe, images hosted, links live, and installed in Klaviyo where the agency can edit copy without touching code. The artboard is the spec, never the starting code. Everything it does with absolute positioning, flexbox, inline SVG and 10px type has to be rebuilt in tables.

Upstream of this skill sits `greedy-email`, which writes the HTML.to.design HTML that becomes the Figma frame. Downstream is a Klaviyo campaign. This skill is the middle: design → sendable template.

## What you produce

One folder per campaign, committed to the repo (Greedy's live at `emails/greedy/` in the `mjml` fork):

| File | Purpose |
|---|---|
| `<campaign>.mjml` | the source — the only thing anyone edits |
| `<campaign>.html` | MJML output, local placeholder image paths, for offline preview |
| `<campaign>.klaviyo.html` | the same with Klaviyo CDN image URLs, editable regions, fonts fixed |
| `build-klaviyo.js` + `klaviyo.config.json` | the second build step (copy `scripts/build-klaviyo.js`) |
| `assets/` | placeholder slots, wordmark PNGs, CTA arrowhead |
| `preview/` | `desktop.png`, `mobile.png` from `scripts/measure.js` |
| `README.md` | build commands, image slot table, links, what changed vs the artboard and why |

Plus a Klaviyo template (`USER_DRAGGABLE`) in the brand's account, and a short report to the user.

## Before you start

- **Inputs.** The Figma frame URL (file key + node id) and/or the HTML.to.design export. If only the export is given, ask for the frame link — the photography lives in Figma, not in the export.
- **Accounts.** Figma and Klaviyo MCP connections. Confirm which Klaviyo account is connected (`get_account_details`) before writing to it; the wrong account is a bad day.
- **Sandbox limits.** The remote sandbox's egress blocks `figma.com`, Klaviyo's CloudFront CDN and most image hosts. You cannot `curl` a Figma export or a Klaviyo image. Don't fight it — Klaviyo's `upload_image_from_url` fetches Figma export URLs server-side, and accepts `data:` URIs for anything you generate locally. `references/figma-assets.md` has the route.
- **Confirm before creating a Klaviyo template.** It's a live account. Ask once (locked code vs hybrid, which account), then updates to that same template in the session don't need re-asking — unless the user pauses you, in which case stop pushing until told.

## Tooling

- `npx mjml@5` compiles; the `mjml` fork at HEAD is the same version, so the published package is fine.
- The scripts in `scripts/` use Playwright. Install it once in a scratch directory (`npm install playwright`) and run the scripts with `NODE_PATH=<that>/node_modules`. In the remote sandbox Chromium is preinstalled — the scripts default to `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; set `CHROMIUM_PATH` elsewhere. Don't run `playwright install`.
- Always create pages with `browser.newContext({ viewport, deviceScaleFactor, isMobile })`. Options passed to `browser.newPage()` are ignored and you get plausible-looking 1280×720 screenshots of the wrong thing — that cost a round of debugging.

## The pipeline

Work it in this order. Each step has a verification; don't move on without it.

### 1. Read the design, not the export

Pull the frame's metadata (`get_metadata` on the node) and a screenshot. From the metadata, write down every image slot (node id, x, y, w, h) and every text node. Compare the Figma text with the export's copy — they drift. Flag differences to the user; never silently adopt Figma text the user didn't hand you.

Then load `references/email-structure.md` and map each region of the artboard to its email construction. The Greedy layout is fully worked there; a new layout uses the same primitives.

### 2. Write the MJML

Start from `assets/greedy-launch.mjml` when the brand is Greedy (or the layout is close); otherwise start from its skeleton. Rules that aren't negotiable, with the reason each exists:

- **Content width = 575, not 600.** The 24px left gutter and the 1px rail come off the top. Every image slot is exported at 575-wide geometry. Get this wrong and the hero composite misaligns with the panel.
- **The hero is a section background** (`mj-section background-url`), so MJML emits the VML rect Outlook needs and the cream panel with live text can sit on top. It's the only way email overlaps photos and a panel. Consequence: the hero can never be an editable image block in Klaviyo; swap it by rebuilding.
- **Live text everywhere text exists.** Searchable, translatable, readable with images off, and it's what makes the Klaviyo editable regions possible.
- **Body type ≥ 14px.** The artboard says 10px. iOS silently rescales anything under 13px, which breaks the layout in ways a desktop preview never shows. Widen the measure proportionally so characters-per-line stay close to the design.
- **Reading order survives stacking.** A magazine layout that reads *down* columns must become two continuous columns that stack in order on a phone. Never keep row-by-row columns that interleave sentences when stacked.
- **Arrow CTAs are a rule + a chevron PNG**, never a `→` glyph. `references/email-structure.md` has the exact markup; `assets/arrow-head@2x.png` is the chevron. Both anchors (label and chevron) get the same href.
- **Fonts: one `mj-font` per family.** A single combined Google Fonts request 400s if any family is wrong, and takes the others down with it. `Libre Caslon Condensed` is not on Google Fonts.
- **Footer carries `{% unsubscribe %}`**, `{{ organization.name }}`, `{{ organization.full_address }}`. Klaviyo refuses to send without the unsubscribe tag.

Compile: `npx mjml@5 <campaign>.mjml -o <campaign>.html --validate`. Zero warnings or fix them.

### 3. Verify the render before anything else

```
node scripts/measure.js <campaign>.html preview/
```

It renders at 800 and 390, writes screenshots and 3x CTA crops, and prints hero height, column width and the CTA join delta. Hero height must equal the collage height (540 for Greedy); columns must be two-up on desktop and one-up on phone; every CTA delta must be `0`. **Look at the crops.** Numbers catch geometry; eyes catch a chevron drawn wrong.

Half-pixel CTA deltas mean a rule table is on `border-collapse: collapse` — see `references/email-structure.md`.

### 4. Get the photography

`references/figma-assets.md`. Short version: export each slot from Figma at 2x with `download_assets` on the slot node and hand the URL straight to Klaviyo's `upload_image_from_url`. Slots that need geometry (the hero composite, a full-bleed crop) are built as temporary frames *inside Figma* — clone the photo rectangles in, shift −25px for the gutter+rail, export, upload, delete the frame. Verify each upload's byte size equals Figma's export size.

Wordmarks and the arrowhead are already PNGs in `assets/`; upload them as data URIs via `scripts/rasterize.js` output.

Until the photography exists, `scripts/placeholders.js` makes slot-grey stand-ins with the geometry printed on them.

### 5. Build the Klaviyo variant

Copy `scripts/build-klaviyo.js` beside the MJML, write `klaviyo.config.json` mapping every local asset path to its CDN URL, and run it. It asserts every image replacement (the hero path appears **four** times — VML, div shorthand, table attribute, table shorthand), strips the font `<link>` tags Klaviyo's editor doesn't understand, marks the copy cells as editable regions, and fixes the unsubscribe tag. A failed assertion means the MJML changed shape; fix the config, don't bypass the check. `references/klaviyo.md` explains the region rules.

Then run `measure.js` on the Klaviyo output too — image URLs won't load in the sandbox (expected), but the geometry must be unchanged.

### 6. Install in Klaviyo

`create_email_template` with `editor_type: USER_DRAGGABLE`, the built HTML and a plaintext `text`. Keep the returned id in the README — every later change is `update_email_template` on that id, never a second template. After each write, `render_email_template` with `fields_template: ["text"]` proves the Liquid tags resolve without pulling 40 KB back into context. The API doesn't expose parsed regions for hybrid templates; tell the user to eyeball the editor once.

### 7. Commit, document, report

Commit the whole folder including generated outputs and previews — the HTML is what gets pasted in an emergency. README must have: build commands, the Klaviyo template id and URL, the image slot table with sizes, where each link goes, and a "what changed from the artboard and why" list. Report to the user in a few lines: link to the template, what's editable, what isn't and why, anything flagged (copy drift, licensed fonts).

## Iterating after feedback

Most follow-ups are one of these; each is a small, verified push, not a rebuild:

- **Links** → find-and-replace the href in the MJML (each CTA has two anchors), rebuild both outputs, update the template. Klaviyo and repo must carry identical HTML — send the built file, not a hand edit.
- **Photography** → export the slot again, upload, change one line in `klaviyo.config.json`, rebuild, update.
- **Copy** → if it's inside an editable region the agency can do it in Klaviyo; otherwise edit the MJML.
- **"Something looks broken"** → `measure.js` first, then the crops. Ask for a screenshot if the report is vague.

## Definition of done

- `mjml --validate` clean; `measure.js` exits 0 with hero height correct and every CTA delta 0, on both breakpoints
- No `href="#"`, no `assets/` path, no `<link>` tag in the Klaviyo output
- Every image upload byte-matched its source
- Template renders through Klaviyo's API; unsubscribe tag resolves
- Temporary Figma frames deleted, none left behind
- Folder committed with README and previews; PR description matches the code
- User told what's editable, what's not, and what's still on them

## References

| Read when | File |
|---|---|
| translating any region of the artboard, fixing a CTA, fonts, mobile | `references/email-structure.md` |
| getting images out of Figma, compositing the hero, uploading | `references/figma-assets.md` |
| regions, create/update, render checks, editor warnings, the one-way door | `references/klaviyo.md` |
| Greedy tokens, fonts, slot sizes, signature elements, voice | `references/greedy-design-system.md` |
