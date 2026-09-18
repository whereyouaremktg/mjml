# Klaviyo: hybrid template, uploads, updates, gotchas

## The one-way door (if anyone ever pastes by hand)

Klaviyo has two template kinds and you choose at creation: drag-and-drop, or code. It cannot convert between them. Starting from a campaign lands in drag-and-drop with no paste-HTML option, so people start over. Via the API this is `editor_type`, and via the UI it's Content → Templates → Create Template → **Code**. Prefer the API: `create_email_template` with the built HTML, then `update_email_template` on the returned id for every later change.

## Hybrid (`USER_DRAGGABLE`) — what the build script emits and why

The layout stays locked as code; specific cells become editable in Klaviyo's UI:

```html
<td ... data-klaviyo-region="true" data-klaviyo-region-width-pixels="237">
  <div class="klaviyo-block klaviyo-text-block"><p ...>Headline</p></div>
  <div class="klaviyo-block klaviyo-text-block"><p ...>Body</p></div>
</td>
```

- A region may contain **only** klaviyo blocks. Mixed raw markup inside a region is unsupported — that's why the hero panel is two rows: the copy row is the region, the CTA table sits in the next row outside it.
- `data-klaviyo-region-width-pixels` is the cell's inner width (panel 277 − 2×20 padding = 237; editorial columns 241; headline 499).
- The text block wraps the existing styled element (`<p>` or MJML's `<div style=…>`), so the typography carries into the editor.
- Images can be `klaviyo-image-block`s, but the hero can't — it's a CSS/VML **background**, not an `<img>`. Swap it by rebuilding. Wordmarks, CTA rows and the rail are left structural on purpose: editable there just invites breakage.
- `get_email_template` returns `definition: null` for hybrid templates — the API doesn't expose the parsed regions, so tell the user to open the editor once and confirm the four regions surface before a campaign is built on it.

## After the agency edits in the UI

Klaviyo's hybrid editor wraps region contents in its own component wrapper when a template is saved from the UI, which can add a few pixels of padding around each region. The hero section is tuned to exactly the collage height, so after the first in-editor save it is worth re-measuring (or eyeballing the hero bottom edge against the collage) — if it drifted, trim the panel cell's bottom padding in the MJML by the same amount and push again. Unverified from the API; reported by one run.

## Editor warnings

`Unknown node "link"` ×3 → the Google Fonts `<link rel="stylesheet">` tags MJML emits from `mj-font`. The editor parses the HTML into its own node model and doesn't know `<link>`. `build-klaviyo.js` strips them; the `@import` rules in the `<style>` right after cover the same clients. It also un-escapes `&amp;` inside those `@import` URLs — `<style>` content is raw text, so the entity was going to Google literally.

## Uploads

`upload_image_from_url` — `import_from_url` is a public URL Klaviyo fetches server-side (Figma export URLs work; short-lived, use promptly) **or** a `data:image/png;base64,…` URI (≤ 5 MB). Name uploads so the library stays legible: `Greedy Launch 01 - hero collage 575x540 @2x`. Verify `size` against the source's byte count. The returned `image_url` is what goes in `klaviyo.config.json`.

## Create / update

```json
{ "data": { "type": "template", "attributes": {
    "name": "Greedy Launch 01 - Greedy For Better, Not More",
    "editor_type": "USER_DRAGGABLE",
    "html": "<full built HTML>",
    "text": "<plaintext with the same copy and links>" } } }
```

Update with the same `html` (and `text` when copy or links change) on the existing id. Send the **built file**, not a hand-edited copy — the repo and Klaviyo must carry identical HTML. When the change is tiny (four hrefs, three head lines) it's acceptable to derive the payload from the last one you sent by the same substitutions, *provided* you verify the built file's byte size matches the expected delta.

`{% unsubscribe 'Unsubscribe' %}` is the labelled form Klaviyo needs; the build converts `{% unsubscribe %}`.

## Verify without pulling 40 KB back

`render_email_template` with `fields_template: ["text"]` and a context like `{ "organization": { "name": "…", "full_address": "…" } }` proves the template parses and every Liquid tag resolves (the unsubscribe tag renders as a real anchor). Do it after every write.

## Sizes

MJML output for this layout is ~43 KB — well under Gmail's 102 KB clipping threshold. Watch it if sections are added.
