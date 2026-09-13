# Zinara × Revolv — Figma → Theme build plan

Figma file key: `YngyPFSvQeGOiYPjQYuhVv` ("Beyond Beyond Website")
Plan written: 2026-09-12

**This file is the resume point.** Progress lives in the checkboxes below. If a
session ends mid-build (plan limit, crash, new chat), a fresh session can pick up
by reading this file top to bottom: the audit says what exists, the node table
says which Figma frame each file comes from, and the phase list says what is
left. Tick a box only when the file is written *and* the page renders.

---

## 1. Audit — state at the time of writing

### Already built to the designs

| Page | Template | Main section(s) | Skeleton |
| --- | --- | --- | --- |
| Home | `templates/index.json` (17 sections) | `hero-banner`, `shop-by-category`, `usp-strip`, `product-carousel` ×2, `know-your-jewellery`, `usp-grid`, `zinara-collections`, `testimonial-carousel`, `occasion-showcase`, `split-promo`, `press-carousel`, `instagram-feed`, `journal`, `faq`, `logo-marquee` | **missing** |
| PLP / collection | `templates/collection.json` | `sections/collection.liquid` | **missing** |
| PDP / product | `templates/product.json` | `sections/product.liquid` | `snippets/pdp-skeleton.liquid` |
| Search results | `templates/search.json` | `sections/search.liquid` | `snippets/search-skeleton.liquid` |
| About us | `templates/page.about-us.json` | `about-hero`, `about-intro`, `about-stats`, `about-belief`, `about-story`, `about-founder`, `about-contact` | **missing** |

### Not built — still Shopify boilerplate or absent

| Page | Current state |
| --- | --- |
| Blogs listing | `sections/blog.liquid` is stock Shopify boilerplate |
| Blog article | `sections/article.liquid` is stock Shopify boilerplate |
| All collections | `sections/collections.liquid` is stock Shopify boilerplate |
| Wishlist | no template, no section (only `assets/wishlist.js`, a localStorage toggle) |
| Contact us | no template, no section (`about-contact.liquid` is a block *inside* About) |
| Get your own design | nothing |

### Already reusable — do not rebuild these

`breadcrumb`, `faq`, `logo-marquee` (the "Featured in" strip), `usp-strip`,
`instagram-feed`, `shop-by-category`, `product-card.liquid` (has `carousel` and
`grid` variants), `category-nav`, `header-group`, `footer-group`, `cart-drawer`,
`scroll-carousel.js`, `animations.js`.

Every new page ends with the same three sections as the built pages:
`faq` → `featured-in` (logo-marquee) → footer-group. Copy the `breadcrumb`, `faq`
and `featured-in` section JSON verbatim out of `templates/collection.json`.

---

## 2. Figma node map

Real frame first, skeleton second. Skeleton frames are identifiable because they
strip the page body down to grey tiles — they still carry ~51 text nodes / ~630
chars from the announcement strip and footer, which stay real.

| Page | Section (page) | Real frame | Skeleton frame |
| --- | --- | --- | --- |
| Blogs listing | `7930:93522` | `7930:93788` | `7930:93523` |
| Blog article | `7930:93522` | `7930:93922` | `7930:94079` |
| Wishlist | `7930:94295` | `7930:94300` | `7930:94446` |
| Contact us | `7930:94595` | `7930:94717` | `7930:94604` |
| All collections | `7930:94864` | `7930:94873` | `7930:94998` |
| Get your own design | `7930:95112` | `7930:95121` | `7930:95299` |
| Home | `7930:103259` | `7930:104246` | `7930:103276` |
| PLP | `7930:101918` | `7930:101927` | `7930:102108` |
| PDP | `7930:95962` | `7930:95967` | `7930:96523` |
| Search | `7930:105417` | `7930:105422` | `7930:106276` |
| About us | `7930:95465` | `7930:95474` | `7930:95738` |

Secondary states already accounted for: PLP variant bottom-sheet `7930:102487`,
PLP size guide `7930:102915`, PDP image lightbox `7930:96866`, search active
`7930:105606`, hamburger menu `7930:103629`.

### Reading Figma without blowing up context

`get_metadata` on a whole page section returns 60–85k characters. Prefer the REST
API with the token in `.figma_token` plus the helper scripts (recreate them in the
scratchpad if the session is new — they are 20 lines each):

```bash
TOK=$(cat .figma_token)
curl -s -H "X-Figma-Token: $TOK" \
  "https://api.figma.com/v1/files/YngyPFSvQeGOiYPjQYuhVv/nodes?ids=7930-94717&depth=6" \
  -o node.json
python3 content.py node.json 5 7930:94717   # depth-limited tree, skips chrome + footer
```

`content.py` prints a depth-limited tree with names, `WxH`, and text content, and
skips the repeated chrome (`Browser Bars`, `Announcement strip`, `Navbar`,
`Page navbar`, `Breadcrumb nav`) and the ~739px-tall footer `Q` frame. Use
`mcp__figma__get_screenshot` for visual checks (it returns a URL to curl, far
cheaper than base64).

---

## 3. Conventions this theme already follows

Match these — they are not negotiable, the built pages all do it this way.

- **Sections** carry a leading `{%- comment -%}` naming the Figma node they came
  from, and why the approach was chosen. See `sections/search.liquid:1-11`.
- **CSS** is one file per section in `assets/`, pulled in at the top of the
  section with `{{ 'name.css' | asset_url | stylesheet_tag }}`. Never inline a
  block of CSS in the section body.
- **Class naming** is `block_element_sub` (single underscore, nests deep) —
  e.g. `journal_wrapper_stage_track_item_card_body_date`. Modifiers use `--`.
- **Copy** goes through `{{ '...' | t }}` with keys in `locales/en.default.json`;
  editable copy goes in section settings instead.
- **Layout** is a 1280px frame with a 72px gutter → 1136px content. In CSS that
  is `max-width: var(--page-width)` + `padding-inline: var(--page-margin)`.
  Grid gutter is 24px.
- **Tokens** come from `snippets/css-variables.liquid` (`--color-*`, `--font-*`,
  `--page-width`, `--page-margin`). Do not hardcode brand colors.
- **Images** use `image_url: width:` + `image_tag` with `widths`/`sizes`/`alt`,
  or `{% render 'image' %}`.
- **Icons** are SVG files in `assets/` pulled in with `inline_asset_content`.
- **Money**: `{% render 'money' %}` — the store's money format has no symbol, and
  money metafields arrive in cents.
- **Carousels** wrap content in `<scroll-carousel>` (`assets/scroll-carousel.js`).
- **Reveal animations** use `data-animate` (`assets/animations.js`).
- **Every section needs `presets`** or it cannot be added in the theme editor.
- Keep `{%- -%}` whitespace trimming consistent with neighbours.

### Skeleton recipe

Follow `snippets/search-skeleton.liquid` + the `.search-skeleton` rules in
`assets/search.css:160-229`. The pattern is:

1. The real markup is server-rendered, so the skeleton **covers** it rather than
   standing in for it: `position: absolute; inset: 0; z-index: 2;` on a white
   ground, `aria-hidden="true"`.
2. It clears on `custom-element:defined` — the moment the page's JS upgrades and
   the controls go live.
3. Behind that sits a CSS timeout (`animation: …-timeout 0s linear 2.5s forwards`
   → `visibility: hidden`) so a blocked or failed script can never strand the
   visitor behind a grey screen.
4. One tile class, sized by inline `style="height: …"` — the placeholder tracks
   the real layout's rhythm instead of duplicating its markup.
5. Shimmer: `linear-gradient(270deg, #f2f2f2, #e0e0e0)` at `background-size:
   200% 100%`, 1.4s ease-in-out infinite, `border-radius: 8px`.
6. Respect `prefers-reduced-motion` by holding the gradient still.

---

## 4. Phases

Phases are ordered so shared pieces land before the pages that consume them.
Within a phase the pages are independent and can be done in any order.

### Phase 0 — shared groundwork
- [x] `snippets/blog-card.liquid` — the Figma "Blog card": 12px-radius card,
      `FEATURED` tag pill (Montserrat 500 8/16, `#712242`, r4, pad 2/6) in a
      20px row that the 270px image laps 12px over, then a 122px body of
      date (12/18 `#666`), title (600 16/20 `#000`), 2-line excerpt
      (500 14/22 `#494949`, clamped), and a "Read more" caret link
      (600 16/20 `#712242`). Variants: `featured` (tag row, 412px) and
      `grid` (no tag row, 404px).
- [x] `assets/blog-card.css`

      **Deviation from the original plan:** `sections/journal.liquid` was left
      alone rather than refactored onto this snippet. The two cards only look
      related — journal's is a fluid container-query carousel card (332px, image
      aspect 316/193, title 16/1.5, read-more 18px, tag absolutely positioned so
      it overhangs the card top by 16px), the blog-page card is a fixed grid card
      (361px, image aspect 361/270, title 16/20, read-more 16px, tag in flow).
      Sharing them would need a variant flag on nearly every property, and
      journal.liquid is already measured against Figma. Two small
      implementations beat one snippet with eight variant branches.
- [x] `assets/skeleton.css` + `assets/skeleton.js` — the shared cover, the
      `skeleton_tile` shimmer, and the three ways a skeleton clears (script on
      `complete`, per-page `:defined`, 2.5s CSS timeout). Both are loaded from
      `layout/theme.liquid`. PDP and search keep their own scoped copies of the
      same rules and are untouched.

      No `snippets/skeleton-tile.liquid` in the end: a tile is one `<span>` with
      an inline height, and `search-skeleton.liquid` already writes them inline.
      A snippet per span would have been indirection for its own sake.
- [x] Locale keys added under `blog`, `collections`, and new `wishlist`,
      `contact`, `custom_design` namespaces in `locales/en.default.json`.
      Section *headings* stay section settings, not locale keys — only fixed UI
      strings live here.

### Phase 1 — Blogs listing  (real `7930:93788`, skeleton `7930:93523`)
- [x] `sections/blog.liquid` rewritten: `<blog-list>` wrapping a "Featured" row
      (3 × `featured` cards) over a "More articles" grid (`grid` cards) and a
      "Load more (N)" button. Both bands are 32/72 white with a centred 28/34
      heading and a 24px gutter. One `paginate` covers both, and the featured
      row renders only on page 1 so those three are held out of the grid rather
      than shown twice. `articles_per_page` defaults to 12, which reproduces
      Figma's "Load more (56)" against its 68-article blog.
- [x] `assets/blog.css`
- [x] `assets/blog.js` — `<blog-list>`, load-more append, mirroring
      `assets/collection.js:193-212` (fetch the next page, lift its
      `[data-grid]` children in, let its own button replace the old one so the
      remaining count stays right, fall back to navigation on error)
- [x] `snippets/blog-skeleton.liquid`
- [x] `templates/blog.json` — `breadcrumb`, `main`, `faq`, `featured-in`
- [x] `theme check` clean, `stylelint` clean (bar the project-wide
      `media-feature-range-notation` complaint that `collection.css` also
      carries), `prettier` formatted

### Phase 2 — Blog article  (real `7930:93922`, skeleton `7930:94079`)
- [x] `sections/article.liquid` rewritten: a 748px measure beside a sticky
      364×368 aside (748 + 24 + 364 = the 1136 content width). Accent-coloured
      date + read-time line, 20/24 title, byline, 748×400 hero, then the
      article's rich text with Figma's scale applied to the rendered HTML from
      `article.css` — the design's "body sections" are `h2 + p` pairs, not
      separate fields. Read time is words ÷ 200, floored at 1.
- [x] `sections/article-related.liquid` + `assets/article-related.css` —
      "More from the journal": heading left, "Read all" pushed right (the one
      band in the theme whose heading is not centred), three `blog-card`s from
      the same blog with the current article held out (fetch N+1, skip self).
- [x] `assets/article.css`
- [x] `snippets/article-skeleton.liquid`
- [x] `templates/article.json` — `main`, `breadcrumb`, `related`, `faq`,
      `featured-in`. Breadcrumb sits *below* the article body, per Figma
      (`7930:93961` at y=1830 against the body's y=232).
- [x] `sections/breadcrumb.liquid` — `article.title` added to the label
      fallback chain, ahead of `blog.title`, so the shared section labels an
      article correctly.

Corrections to the original plan, from reading the frame properly:
- **There is no back button.** The two 40×40 brand icon buttons at
  `7930:93958`/`7930:93959` are the prev/next arrows for an inline product row,
  vertically centred on it (row y=977–1303, arrows at y≈1110/1142) with the left
  one hanging out into the page gutter. Built as a `<scroll-carousel>` of
  `product-card`s — whose carousel variant is already 240px wide, exactly the
  Figma card — styled with the existing `.scroll-carousel_arrow`, which is
  already that 40×40 brand-filled r8 button.
- The related row's link reads **"Read all"**, not "View all".
- **Both** card variants carry the tag pill, so `blog-card` was corrected: the
  `grid` card lays the pill over the image (media stays 270), the `featured`
  card gives it a 20px row and pulls the image 12px back over it (media 278).
  The pill shows `article.tags.first` and is simply absent when there are none.
- Comments are not in the design but were kept, rendered only when
  `blog.comments_enabled?`, so replacing the stock template is not a regression.
- Two things the design shows that Shopify has nowhere to store: the aside image
  and the inline product row. Both read an article metafield first
  (`custom.aside_image`, `custom.shop_products`), fall back to a section
  setting, and render nothing if neither is set — so the page works today with
  no admin setup. **No article or blog metafield definitions exist on the store**
  (checked via the Admin API), so they are listed in §5.
- `number_of_words` is rejected by theme-check, so the word count splits on
  spaces instead.

### Phase 3 — All collections  (real `7930:94873`, skeleton `7930:94998`)
- [x] `sections/collections.liquid` rewritten: a `#fef4e2` cream band with
      `decorative-wave.svg` along its bottom edge, 32/72 padding on a 16px
      stack, and a four-up grid of 266×418 cards (12px-radius 266×357 image over
      a 53px label block). Settings for sort order and hiding empty collections.
- [x] `assets/collections.css`
- [x] `snippets/collections-skeleton.liquid`
- [x] `templates/list-collections.json` — `breadcrumb`, `main`, `faq`,
      `featured-in`

Notes from the frame: the heading is **left**-aligned at `#000` (not the
centred `#494949` the other bands use), and the card title is a centred serif —
Libre Baskerville 600 20/25 in brand `#712242` — over a centred
Montserrat 500 16/20 count. The count reads **"51 items"**, so the new
`collections.product_count` key is "{{ count }} items".

### Phase 4 — Wishlist  (real `7930:94300`, skeleton `7930:94446`)
- [x] `sections/wishlist.liquid` — `<wishlist-page>`: "My wishlist" with a live
      count, the circular category filters, and a four-up grid. 1136 − 3×24 =
      1064 = 4 × 266, so `product-card`'s `grid` variant (already `width: 100%`)
      fits the Figma card with no resizing.
- [x] `sections/wishlist-card.liquid` — renders one card on its own, fetched via
      the **Section Rendering API**
      (`/products/<handle>?section_id=wishlist-card`, which sets `product` from
      the URL). This is what avoids a second copy of the card written in JS. Its
      wrapper carries the product's type and tags so the filters match without
      another request.
- [x] `assets/wishlist.css`
- [x] `assets/wishlist.js` rewritten — the toggles plus the page. Fetches all
      cards in parallel but writes them in stored order so the grid does not
      reshuffle by whichever request landed first; drops handles that no longer
      resolve; un-hearting a card removes it from the grid; count and filters
      stay in step via a `wishlist:change` event, which also keeps the PDP heart
      and a card heart for the same product from disagreeing.
- [x] `snippets/wishlist-skeleton.liquid` — the one skeleton in the theme that
      is a real loading state rather than a cover, so it sits *in* the flow and
      wishlist.js removes it when the cards land. The CSS timeout still applies.
- [x] `templates/page.wishlist.json` — `breadcrumb`, `main`, `faq`,
      `featured-in`, with the four Figma chips (Earrings / Pendants / Rings /
      Bracelets)
- [x] `sections/header-group.json` — `wishlist_url` set to `/pages/wishlist`

Two decisions worth knowing about:
- **Products are now keyed by handle, not id.** A handle can address the product
  URL the cards are fetched from; a numeric id cannot. So
  `data-product-handle` was added to the three heart toggles (`product-card`
  ×2, `product.liquid` ×1) and the store now holds handles. Entries with no
  non-digit character are treated as leftovers from the id-based list and
  dropped on read, rather than 404ing on every visit. Nothing shipped, so no
  real wishlist is lost.
- **The filter chips are toggles.** Figma shows a chip selected but gives no
  "all" chip to escape through, so clicking the active chip clears it — the full
  list stays one tap away without inventing a chip the design does not have.
- An empty state is not in Figma but a first-time visitor lands on it, so
  `wishlist.empty_*` copy was added; there is also a separate "filter matched
  nothing" line.
- The heart's `aria-label` now swaps to the already-present but until-now-unused
  `accessibility.wishlist_remove` when a product is saved.

### Phase 5 — Contact us  (real `7930:94717`, skeleton `7930:94604`)
**No new sections were needed — every band on this page already existed.** The
plan assumed a new `contact-hero`; in fact `sections/about-contact.liquid`
*is* that band, already at the right type (heading Montserrat 600 28/34 `#000`,
intro 16/1.375 `#494949`, three r8 `#e0e0e0` cards on a 24px gutter with the
phone / envelope / whatsapp icons). Likewise the 2×2 gold-bordered USP block is
`usp-grid`, not `usp-strip`, and the Instagram band is `instagram-feed`. So:

- [x] `sections/about-contact.liquid` extended, additively, so the one component
      serves both pages: an optional `label` block setting (the
      "Speak with our experts" line the contact cards carry and the About cards
      do not) and a `copy_on_click` checkbox.
- [x] `assets/contact-channels.js` — the Figma note's copy-on-click. Only a card
      marked `data-copy` is intercepted; email and WhatsApp stay ordinary links.
      If the clipboard refuses (insecure origin, browser policy) the click falls
      through to the `tel:` href it already pointed at.
- [x] `assets/about-contact.css` — label, "Copied" feedback, skeleton
- [x] `snippets/contact-skeleton.liquid`, wired into `about-contact`
- [x] `templates/page.contact-us.json` — `breadcrumb`, `main` (about-contact),
      `usp-grid`, `instagram`. The WhatsApp href carries `?text=…`, which is the
      editable prefilled message the note asks for.
- [x] Icons all already existed (`icon-phone`, `icon-envelope`,
      `icon-whatsapp`); the USP icons are uploaded images, not theme SVGs.

Corrections to the original plan:
- **This page has no FAQ and no "Featured in" band.** `7930:94717` is
  hero → usp-grid → instagram → footer, and the template follows that.
- Figma's skeleton frame shows a large hero tile above the cards that neither
  page has content for. Reproducing it would promise an image that never
  arrives and jump the layout when the cover lifts, so the skeleton traces the
  heading, subcopy and three cards instead.

### Phase 6 — Get your own design  (real `7930:95121`, skeleton `7930:95299`)
- [x] `sections/custom-design-steps.liquid` — "How It Works" with the WhatsApp
      button pushed to the far side of the heading row, then three sideways
      363×138 cards (108×108 image beside a numbered title and a paragraph). The
      step number comes from `forloop.index`, so reordering blocks in the editor
      renumbers them instead of stranding a typed-in number.
- [x] `sections/custom-design-options.liquid` — "Crafted to your choice",
      subcopy, three 363×217 cards (363×181 r8 image + 600 20/24 label). Not
      links: the design has them showing what can be chosen, not as controls.
- [x] `sections/custom-design-gallery.liquid` — "Here's what others have
      designed" on `#efe6ea`, a 237px `<scroll-carousel>` with the shared dots
      and the 40px `.scroll-carousel_arrow`s hung off both edges. Five cards fit
      the content width exactly (5×237 + 4×24 = 1281), so it scrolls.
- [x] `assets/custom-design.css` (one file for all three — they only ever appear
      together on this page)
- [x] `snippets/custom-design-skeleton.liquid` — first band only; the bands
      below are images and text that arrive with the document, so covering them
      would hold back content that is already there.
- [x] `templates/page.get-your-own-design.json` — `breadcrumb`, `main`,
      `options`, `gallery`, `faq`

Correction: **this page has no "Featured in" band.** `7930:95121` ends
steps → options → gallery → FAQ → footer.

### Phase 7 — skeletons for the pages already built
- [x] `snippets/plp-skeleton.liquid` — the check in the old plan was right:
      `search-skeleton` generalised cleanly, because search reuses the whole PLP
      layout and the two skeleton frames differ only by the heading above them.
      So `search-skeleton.liquid` was **replaced** by one `plp-skeleton` with a
      `heading` param, rendered by both `collection.liquid` and `search.liquid`;
      its layout moved into `collection.css` (which both pages already load) and
      the duplicated shimmer/cover/timeout rules in `search.css` were deleted in
      favour of `skeleton.css` (search.css: 286 → 165 lines).
- [x] `snippets/hero-skeleton.liquid` + wired into `sections/hero-banner.liquid`
      (Figma `7930:103276`), clearing on `hero-banner-slideshow:defined`
- [x] `snippets/about-hero-skeleton.liquid` + wired into
      `sections/about-hero.liquid` (Figma `7930:95738`)

**Scope decision on the home and About skeletons.** Figma draws both as
full-page grey sheets (the home one is 8182px). Covering seventeen
server-rendered sections would hold back content that has already arrived and
make the page *feel* slower, so each is scoped to its hero band — the part that
genuinely waits on a large image and, for the home page, on the slideshow
wiring. Everything below paints as it lands. The About hero's photo is a CSS
background and fires no load event, so it has no `:defined` hook and relies on
`skeleton.js` clearing at `complete`, which is after background images.

### Phase 8 — verification
- [ ] `npx shopify theme check` clean (or no new offences)
- [ ] `npx prettier --check` on everything touched
- [ ] Dev server up and every new route loads: `/blogs/news`, an article,
      `/collections`, `/pages/wishlist`, `/pages/contact-us`,
      `/pages/get-your-own-design`
- [ ] Measure rendered section heights against the Figma frame heights with the
      Playwright harness rather than eyeballing (see the Figma-parity note in
      memory); the per-page target heights are in the node table above
- [ ] Every skeleton clears — with JS on, and with JS blocked (the 2.5s timeout)
- [ ] Mobile width check at ~390px

---

## 5. Shopify admin work this needs

The theme cannot create these on its own. Templates named `page.<handle>.json`
only bind once a page with that handle exists.

- [ ] Create pages in admin: **Wishlist** (`wishlist`), **Contact us**
      (`contact-us`), **Get your own design** (`get-your-own-design`), and
      assign each the matching template.
- [ ] Confirm a blog exists and note its handle for `journal.liquid`'s `blog`
      setting and `article-related.liquid`'s fallback.
- [ ] Create the two article metafield definitions the article page reads
      (neither exists yet — verified against the Admin API):
      `custom.aside_image` (type: file / image) and `custom.shop_products`
      (type: list.product_reference). Until they exist the article page falls
      back to its section settings, so this is an enhancement, not a blocker.
- [ ] Upload the new page images (step icons, option cards, gallery, Instagram
      posts) and replace the `shopify://shop_images/...` placeholders.

---

## 6. Resume checklist for a new session

1. Read this file.
2. Find the first unticked box in §4 — everything above it is written and
   rendering. `git status` / `git diff --stat` shows the uncommitted work in
   flight (nothing here is committed unless you asked for it).
3. Confirm the files that phase claims actually exist before moving on.
4. Re-read §3 before writing any code — the conventions are what keep the new
   pages consistent with the five already built.
5. Pull that page's Figma detail with the REST recipe in §2.
