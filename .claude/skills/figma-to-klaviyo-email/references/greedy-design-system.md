# Greedy — design system for email

Pulled from the agency Figma (Glow-Master, key `4v1h28IeyXevRYwOroCQPr`; the campaign frame for Launch 01 is node `491:16345`) and the `greedy-email` skill. Klaviyo account: **Greedy Haircare**, id `TsiEJh`. Shopify: `www.greedyhaircare.com` (Glow Beauty Hair on Plus). Launch 01 template: `Wv3ti4`.

## Tokens

| Token | Hex | Role |
|---|---|---|
| Ink | `#372523` | all type, rules, chevrons, rail, dark wordmark |
| Cream | `#FFF7F0` | hero text panel |
| White | `#FFFFFF` | frame and section background |
| Slot grey | `#C9C3BE` | placeholder image fill only |
| Mute | `#827A76` | placeholder labels, footer text |
| Page | `#E9E9E9` | email body background |

## Type

| Use | Face | Fallback stack | Size |
|---|---|---|---|
| Headlines | ABC Marfa / Libre Caslon Condensed (licensed) | `'Libre Caslon Condensed','Libre Caslon Display',Georgia,'Times New Roman',serif` | 28/33, Medium, italic on the accent word |
| Body | ABC Marfa (licensed, Dinamo) | `'ABC Marfa','Inter','Helvetica Neue',Helvetica,Arial,sans-serif` | 14/20 in email (artboard says 10/12 — see email-structure.md) |
| CTAs, labels, footer | ABC Marfa Mono | `'ABC Marfa Mono','DM Mono','Courier New',Courier,monospace` | 14/16 uppercase; footer 11/18 |

Google Fonts loads Libre Caslon Display, Inter, DM Mono — one request each. `Libre Caslon Condensed` is not a Google family.

## Signature elements

- **Left rail**: 1px ink at x=24, full height. (The rotated white "SHOP NOW" label in the gutter is dropped in email.)
- **Collage hero**: left card 208×282 at 0,0; right card 342×490 at 258,0; cream panel 277×183 at 89,194 bridging them; white wordmark 104×23 at 37,10. Headline at 109,207 (w236), body at 279, CTA at 340.
- **Editorial**: centred headline, 1×84 rule, justified two-column prose with an inset 129×123 between, arrow CTA.
- **Lifestyle break**: full-width 600×304 photo, ink wordmark 69×15 centred below.
- **Arrow CTAs**, never buttons.

## Wordmark

Inline SVG in the export (`Greedy_Wordmark_White 1`, 104×23, `currentColor`). Email needs PNGs: `assets/greedy-wordmark-white@2x.png` (208×46) over photos, `assets/greedy-wordmark-ink@2x.png` (138×30) in the footer. Both are in the Greedy Klaviyo library already.

## Voice

Editorial, declarative, self-possessed. Short fragments. "Greedy is a good thing." "More considered. More thoughtful. More you." Never salesy, no exclamation points. Don't edit copy — flag it.

## Known copy drift (Launch 01)

The Figma frame's text moved on from the export it was built from: it adds "Welcome to a Greedy State of Mind." as a closing line, and carries stray keystrokes ("greedy", "fghj") and a duplicated sentence at column breaks. The export also repeats "More beauty. More intention." across the first two paragraphs. None of that has been changed in the email; raise it, don't fix it silently.

## Links (Launch 01)

All four CTA anchors → `https://www.greedyhaircare.com/collections/greedy-lineup`.
