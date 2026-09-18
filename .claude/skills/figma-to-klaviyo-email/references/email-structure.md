# Translating the artboard into MJML

The artboard is a 600 × N picture of the email. Email clients can't do any of what it uses, so each region is rebuilt from the four things that do work everywhere: nested tables, background images with a VML fallback, `<img>`, and inline styles. This file is the worked translation for the Greedy launch layout, region by region, with the reasons. A new layout reuses the same moves.

## Frame and rail

Design: 600 wide, 1px ink line at x=24 running the full height.

```xml
<mj-body background-color="#E9E9E9" width="600px">
  <mj-wrapper background-color="#FFFFFF" padding="0 0 0 24px">
    <!-- every section -->
  </mj-wrapper>
</mj-body>
```
and in `mj-attributes`: `<mj-section padding="0" border-left="1px solid #372523" />`.

The wrapper's padding is the white gutter; the border-left defaulted onto every section is the rail. Sections stack with no gap, so it reads as one line down the whole email. MJML refuses nested wrappers, which is why it's a section default and not a border on an inner wrapper. **Content width is now 575** — carry that into every image export.

## Hero collage with an overlapping panel

Design: two photo cards (left 208×282 at 0,0; right 342×490 at 258,0), a cream 277×183 panel at 89,194 bridging them with headline, body and CTA, white wordmark at 37,10.

Email can't overlap two images and a panel, so the photos become one composite background and the panel sits on top:

```xml
<mj-section css-class="gr-hero" background-color="#FFFFFF"
  background-url="assets/slot-hero-collage@2x.png" background-size="cover"
  background-repeat="no-repeat" background-position="top center" padding="0">
  <mj-column width="100%">
    <mj-image src="assets/greedy-wordmark-white@2x.png" width="104px" align="left" padding="10px 0 0 12px" alt="Greedy" />
    <mj-text css-class="gr-hero-panel-cell" align="left" padding="161px 0 118px 64px">
      <table role="presentation" class="gr-hero-panel" width="277" cellpadding="0" cellspacing="0" border="0"
             style="border-collapse:collapse; width:277px; background-color:#FFF7F0;">
        <tr><td class="gr-hero-panel-inner" style="padding:16px 20px 0 20px;">
          <p class="gr-hero-headline" style="...">Greedy For <em>Better</em>, Not More</p>
          <p class="gr-hero-body" style="margin:0; ...">...</p>
        </td></tr>
        <tr><td class="gr-hero-panel-cta" style="padding:20px 20px 20px 20px;">
          <!-- arrow CTA table, below -->
        </td></tr>
      </table>
    </mj-text>
  </mj-column>
</mj-section>
```

- `background-size="cover"` + `background-color` fallback: MJML emits `<v:rect>`/`<v:fill>` for Outlook and a plain background for everything else. If images are off, cream panel on white still reads.
- The panel is a raw table inside `mj-text`; the `mj-text` padding is what insets it (64 = design 89 − 25). Two rows, not one: the top row becomes a Klaviyo region and regions may only contain blocks, so the CTA table lives in its own row outside it.
- **Make the section exactly the collage height.** wordmark row (10 + 23) + panel-cell padding-top + panel height + padding-bottom = 540. Measure the panel (it grows when body type goes to 14px), then set the bottom padding so the total lands on 540. At 540 the composite maps 1:1 with no crop; taller and `cover` crops the sides.
- Wordmark at design x=37 → `padding-left 12` (37 − 25). Design y=10 stays.
- Mobile: a media query on `td.gr-hero-panel-cell` (padding `108px 16px 28px 16px`) and `table.gr-hero-panel { width:100% }` lets the panel span the phone and ride higher; `cover` keeps the photo behind it.

## Editorial: headline, rule, two columns, inset, CTA

Design: centred 28px headline, 1×84 rule, three rows of justified 10px text (171|171, 106|img|106, 171|171) reading *down* each column (A→C→E left, B→D→F right), a centred 129×123 inset, a centred arrow CTA.

The row-by-row columns can't survive stacking: on a phone they interleave the sentences. Same words, new structure:

- headline `mj-text` centred, 28/33
- the rule: a 1×84 table cell with a background colour (a `div` with a height collapses in Outlook)
- **two 50% `mj-column`s**, left = A+C+E, right = B+D+F, so desktop reads across and phone reads down in the right order. Join the sentences that were split at column breaks ("knowing what | you want").
- inset image centred *after* the columns, then the CTA. The nested-between-columns image is the one thing that genuinely can't be responsive.
- Type 10px → 14px/20px, measure 357 → ~499 (section padding 38px on 575) so characters-per-line stays close to the artboard. Justified above 400px; below it `text-align:left !important` — justified 14px in a 330px column opens rivers.

## Arrow CTAs

Design: `LABEL ————→`, 14/16 mono uppercase, a 1px line ending in an open 4×7 chevron. Hero version fills the panel width; editorial version is a fixed 70px line, centred.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td valign="middle" style="padding:0 8px 0 0; font-family:'ABC Marfa Mono','DM Mono','Courier New',Courier,monospace; font-weight:500; font-size:14px; line-height:16px; text-transform:uppercase; color:#372523; white-space:nowrap;">
      <a href="URL" style="color:#372523; text-decoration:none;">Shop Now</a>
    </td>
    <td valign="middle" width="100%" style="font-size:0; line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; border-spacing:0;">
        <tr><td height="8" style="height:8px; line-height:8px; font-size:1px; mso-line-height-rule:exactly; border-bottom:1px solid #372523;">&#160;</td></tr>
        <tr><td height="7" style="height:7px; line-height:7px; font-size:1px; mso-line-height-rule:exactly;">&#160;</td></tr>
      </table>
    </td>
    <td valign="middle" width="8" style="width:8px; font-size:0; line-height:0;">
      <a href="URL" style="text-decoration:none;"><img src="assets/arrow-head@2x.png" width="8" height="16" alt="" style="display:block; width:8px; height:16px; border:0; outline:none;" /></a>
    </td>
  </tr>
</table>
```

Why each part is the way it is:

- **Not a `→` glyph.** A glyph has its own stem and side-bearings and sits on a text baseline; after a separately drawn rule it renders as *line, gap, second short line slightly lower* — a broken arrow, in every client. This was the first user-reported defect.
- **The rule is an 8px cell with `border-bottom`**, so the line is at y=8 of a 16px-tall block. The chevron PNG is 8×16 with its own lead-in line at y=8. Same height, same y, `valign=middle` → one continuous line, Outlook included.
- **`border-collapse: separate` on the rule table.** MJML's global `table, td { border-collapse: collapse }` centres a 1px border on the row boundary — half of it falls into the next row and the line lands at y=7.5, a visible half-pixel step against the chevron. `separate` keeps the border inside the cell. `measure.js` reports this as `delta`; it must be 0.
- **Two anchors, same href.** Label and chevron are separate cells; both clickable means the whole row is tappable. Wrapping the layout table in one `<a>` breaks in Outlook.
- Editorial variant: outer table `align="center"` with `margin:0 auto`, rule cell `width="70"`, label padding-right 12.

The chevron: `assets/arrow-head@2x.png`, 16×32 rendered from `M0 17H14M6 10L14 17L6 24`, stroke 2, ink. Regenerate at another colour with `scripts/rasterize.js`.

## Fonts

```xml
<mj-font name="Libre Caslon Display" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&amp;display=swap" />
<mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&amp;display=swap" />
<mj-font name="DM Mono" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&amp;display=swap" />
```

One request per family: Google Fonts returns 400 for a combined request containing any unknown family, and one 400 loses every font in it. The HTML.to.design export asks for `Libre Caslon Condensed`, which does not exist on Google Fonts — its whole font request was failing. Keep the licensed names first in every stack (`'ABC Marfa'`, `'ABC Marfa Mono'`, `'Libre Caslon Condensed'`) so installed faces still win; Apple Mail is about the only client that loads web fonts anyway, so the fallbacks matter more than the imports.

## Lifestyle break and footer

Full-width `mj-image` (575 wide, `width="575px"` so MJML makes it fluid), ink wordmark 69px centred 10px below. Footer in 11px mono, `{{ organization.name }}`, `{{ organization.full_address }}`, `{% unsubscribe %}` — `build-klaviyo.js` turns the last into the labelled form.

## Mobile

`<mj-breakpoint width="480px" />` so tablets keep two columns. Phone overrides live in `mj-style` keyed on `css-class` names MJML puts on the `<td>` (`td.gr-hero-panel-cell`, `td.gr-editorial-pad`, `td.gr-col-text`…). Check where each class lands in the compiled HTML before writing a selector — `mj-text` classes go on the td, `mj-section` classes on the outer div.

## What the artboard has that email doesn't get

Rotated rail label ("SHOP NOW" written vertically in the gutter) — transforms don't render, and a rotated PNG in a 24px gutter is unreadable on a phone. Drop it and say so.
