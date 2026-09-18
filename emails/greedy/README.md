# Greedy — Klaviyo email build

`greedy-launch-01.mjml` is the source. Everything else is generated — edit the MJML,
rebuild, never hand-edit the HTML.

    npx mjml@5 emails/greedy/greedy-launch-01.mjml -o emails/greedy/greedy-launch-01.html
    node emails/greedy/build-klaviyo.js

| File | What it is |
|---|---|
| `greedy-launch-01.mjml` | source |
| `greedy-launch-01.html` | compiled, local placeholder image paths, 39 KB |
| `greedy-launch-01.klaviyo.html` | the above with Klaviyo CDN image URLs and the editable regions injected |
| `build-klaviyo.js` | the second step — swaps image URLs, marks the regions, asserts every replacement matched |

Compiled output is under Gmail's 102 KB clipping threshold.

## It is already in Klaviyo

Template **Greedy Launch 01 - Greedy For Better, Not More**, id `Wv3ti4`, in the Greedy
Haircare account — https://www.klaviyo.com/email-editor/Wv3ti4/edit

It is a **hybrid (`USER_DRAGGABLE`)** template: the layout is locked as code, and four
regions are editable in Klaviyo's UI without touching HTML —

| Region | Blocks |
|---|---|
| Hero cream panel | headline, body |
| Editorial headline | "Let's Get Greedy." |
| Editorial left column | prose |
| Editorial right column | prose |

All five images are in the Klaviyo image library and referenced by CDN URL, so the
template renders as soon as you open it. The hero, inset and lifestyle are the real
photography, exported from the Figma campaign frame at 2x (library names start
`Greedy Launch 01 -`); the wordmarks are rasterised from the SVG.

Not editable in the UI, by design:

- **The hero collage.** It is a CSS/VML section background, which Klaviyo cannot expose
  as an image block. Overlapping two photo cards with a cream panel is the whole point
  of the hero and email has no other way to do it. Swap it by rebuilding, or by editing
  the four URL occurrences in Klaviyo's code view.
- **The CTA rows, the rail and the wordmarks.** Structural or brand marks; editable
  regions there would just invite breakage.

To push a new version: rebuild, then update template `Wv3ti4` rather than creating a
second one.

## If you ever need to paste it in by hand

The one trick: **pick the code editor at creation — it is a one-way door.** Klaviyo
cannot convert a drag-and-drop template to code or back. Start from the campaign and you
land in the drag-and-drop builder with no paste-HTML escape hatch, and you start over.

1. Content → Templates → **Create Template → Code Template**. Not the campaign flow.
2. Paste the whole contents of `greedy-launch-01.klaviyo.html`, `<!DOCTYPE>` to `</html>`.
3. Swap every image path for a hosted URL. Upload to Klaviyo's image library
   (Content → Images), copy the URL, then **find and replace the path, not the
   `src=`** — one of the five appears more than once:

   | Path to find | Occurrences |
   |---|---|
   | `assets/slot-hero-collage@2x.png` | **4** |
   | `assets/greedy-wordmark-white@2x.png` | 1 |
   | `assets/slot-inset@2x.png` | 1 |
   | `assets/slot-lifestyle@2x.png` | 1 |
   | `assets/greedy-wordmark-ink@2x.png` | 1 |

   The hero is a section **background**, not an `<img>`, so its path is emitted four
   times: the Outlook VML `<v:image src>`, the `<div>` background shorthand, the
   `<table background="">` attribute, and the table's background shorthand. Replace
   one and miss another and the hero goes blank in either Outlook or everything else.
   The comment above that block in the HTML says the same thing.
4. Replace all **four** `href="#"` placeholders — two per CTA. The label and the arrow
   are separate anchors, so the whole CTA is tappable rather than just the small text
   run; give both anchors in a CTA the same destination.

   | CTA | Anchors |
   |---|---|
   | Shop Now (hero) | label + arrow |
   | The Detangling Brush (editorial) | label + arrow |
5. The footer carries `{% unsubscribe %}`, `{{ organization.name }}` and
   `{{ organization.full_address }}`. Delete that section if your Klaviyo template
   already appends a footer — but Klaviyo will not let you send without an
   unsubscribe link somewhere.

## Image slots

Relative paths under `assets/` render a correct local preview. The three photo slots
there are placeholders and stay that way: the real files live in Klaviyo's library and
`build-klaviyo.js` swaps them in. (The build sandbox cannot fetch Klaviyo's CDN, so the
real photography is not mirrored into the repo.)

| Slot | Placed at | Export | Notes |
|---|---|---|---|
| Hero collage | section background | 575 × 540 (@2x 1150 × 1080) | Both photo cards composited onto white as one file. Left card bleeds to x=0, right card sits at x=233. |
| Wordmark, white | hero, over the left card | 104 × 23 (@2x 208 × 46) | `assets/greedy-wordmark-white@2x.png` is generated from the SVG and ready to upload. |
| Inset | between editorial and CTA | 129 × 123 (@2x 258 × 246) | |
| Lifestyle | full width | 575 × 304 (@2x 1150 × 608) | |
| Wordmark, ink | under lifestyle | 69 × 15 (@2x 138 × 30) | `assets/greedy-wordmark-ink@2x.png`, ready to upload. |

The hero has to be one composite because email cannot overlap two images and a panel.
Everything above the cream panel — both cards, the white gap between them, the crop —
lives in that single file.

### Swapping photography without downloading anything

Figma export URLs are fetchable by Klaviyo's `upload_image_from_url`, so the whole route
is Figma → Klaviyo with no local file. For the two slots that need geometry applied:

1. In the campaign file, make a temporary frame the size of the slot (hero 575 × 540,
   lifestyle 575 × 304), white fill, clip content.
2. Clone the photo rectangles into it, shifted **−25 px in x** — that is the 24 px gutter
   plus the 1 px rail the email adds on the left. Hero: left card at x = −25, right card
   at x = 233. Lifestyle: the 600-wide image at x = −25.
3. Export the frame at 2x, hand the URL to Klaviyo, delete the frame.
4. Paste the new CDN URL into `IMAGES` in `build-klaviyo.js`, rebuild, update template
   `Wv3ti4`.

The inset needs no geometry — export the rectangle itself at 2x.

## What changed coming out of Figma, and why

The Figma export is an artboard: absolute positioning, flexbox, inline SVG, 10px type.
None of that survives an email client. The structure below is what the same design
becomes when it has to render in Outlook and reflow on a phone.

- **Hero overlap** — kept, as a section background image with the cream panel and live
  text sitting on top. MJML emits the VML rect Outlook needs. The headline, body and CTA
  stay live text, so they are searchable, translatable, and still readable with images
  off.
- **Left rail** — kept. A 24px white gutter from the wrapper, then a 1px ink
  `border-left` defaulted onto every section. Sections stack with no gap, so it reads as
  one line down the full height.
- **Rotated "SHOP NOW" rail label** — dropped. CSS transforms don't render in email, and
  a rotated PNG in a 24px gutter is unreadable on a phone.
- **Inline SVG** (wordmark, CTA arrows) — SVG doesn't render in Gmail or Outlook. The
  wordmarks became PNGs. The arrows became a 1px table rule plus a `→` character, so
  they stay live, recolourable, and stretch with the layout instead of pixelating.
- **Editorial three-row magazine flow** — restructured. The artboard runs A|B, then
  C|image|D, then E|F, with prose reading *down* each column: A→C→E on the left,
  B→D→F on the right. Stack those rows on a phone and the sentences interleave into
  nonsense. Same words, now two continuous columns that stack in the right order, with
  the inset image moved between the columns and the CTA. Not one word was cut.
- **Body type 10px → 14px/20px** — 10px is unreadable on a phone and iOS silently
  rescales anything under 13px, which breaks the layout in a way you can't see from a
  desktop preview. Measure was widened proportionally (357px → 499px) so the
  characters-per-line stays close to the artboard.
- **Justified text** — kept above 400px, falls back to ragged right below it. At phone
  width, justified 14px opens rivers.
- **Fonts** — the export's Google Fonts request 400s: `Libre Caslon Condensed` is not a
  Google family, and one bad family fails the whole combined request, so Inter and
  DM Mono never loaded either. Now three separate requests, with Libre Caslon Display as
  the nearest Google match. Only Apple Mail and a few others honour webfonts at all;
  everything else lands on the fallback stacks, which is why `'ABC Marfa'` and
  `'ABC Marfa Mono'` still lead the stacks for anyone with the licensed faces installed.
- **Breakpoint** — 480px. Two columns above, one below.

## Still on you

- The duplicated line in the editorial copy: paragraph one ends "More joy. More beauty.
  More intention." and paragraph two opens "More beauty. More intention." That repeat is
  in the Figma copy, so it's preserved verbatim here rather than silently edited.
- Alt text on the lifestyle and inset images is empty — they're decorative. Give the
  hero and wordmarks real alt text if you want them announced.
- Litmus/Email on Acid before the first send. The hero background is the piece most
  worth checking in Outlook 2016 and Windows Mail.

## Preview

`preview/desktop-600.png` and `preview/mobile-390.png`, rendered from the compiled HTML.
