# HTML curriculum — source verification

Checked: **2026-10-06**. Each page below was fetched and read in this session. This document records what each
source supports, in our own words. No source prose was copied into the lessons, and no quotes were stored, so the
knowledge layer marks these sources `fetched-web` with `crossChecked: false`. The test suite cannot re-read web
pages offline, so the lessons are `READY_WITH_LIMITATIONS` rather than `READY`.

The ids match `src/content/knowledge/sources.ts`.

| Source id | Page | Publisher |
|---|---|---|
| `mdn-basic-html-syntax` | MDN Learn — Basic HTML syntax | Mozilla (MDN) |
| `mdn-headings-paragraphs` | MDN Learn — Headings and paragraphs | Mozilla (MDN) |
| `mdn-img-element` | MDN reference — `<img>` | Mozilla (MDN) |
| `mdn-a-element` | MDN reference — `<a>` | Mozilla (MDN) |
| `mdn-structuring-documents` | MDN Learn — Structuring documents | Mozilla (MDN) |
| `whatwg-html-syntax` | HTML Living Standard §13 The HTML syntax | WHATWG |
| `whatwg-html-sections` | HTML Living Standard §4.3 Sections | WHATWG |

## What each source supports

- **mdn-basic-html-syntax**:
  - An element is an opening tag, content and a closing tag.
  - Forgetting a closing tag is a common beginner error with unexpected results.
  - Void elements such as `img` have one tag and no content.
  - Nesting must not overlap.
  - Attributes are `name="value"` in the opening tag, and quoting values is recommended.
  - Document skeleton: doctype, `html`, `head` (metadata, title), `body` (visible content).
- **mdn-headings-paragraphs**:
  - `h1`–`h6` form a hierarchy; use one `h1` per page and don't skip levels.
  - Don't choose a heading level for its visual size.
  - Paragraphs are wrapped in `p`.
  - Prefer `strong` / `em` over presentational `b` / `i`.
- **mdn-img-element**:
  - `src` is the image path; `alt` is replacement text, essential for accessibility.
  - `img` is void (no end tag).
  - The browser shows `alt` when the image cannot load.
  - Describe the image's purpose rather than writing "image"; use empty `alt` for decorative images.
- **mdn-a-element**:
  - `a` creates hyperlinks and `href` is the destination.
  - Link text should describe the destination: avoid "click here" / "here".
- **mdn-structuring-documents**:
  - `header` holds introductory content; `main` holds content unique to the page, used once per page.
  - `section` groups one theme and usually starts with a heading.
  - `footer` holds end content.
  - `div` is a generic container, used only when no better element exists.
  - `head` (metadata, not shown) is not `header` (shown).
- **whatwg-html-syntax**:
  - Lists the void elements, and end tags must not be written for them.
  - The `p` end tag may be omitted in certain cases, but the `h1` end tag may not.
  - Attribute values may be unquoted, single-quoted or double-quoted.
  - Tag names are ASCII case-insensitive.
- **whatwg-html-sections**:
  - `body` holds the document's contents; `header` is introductory/navigational, not a new section.
  - `footer` belongs to its nearest sectioning ancestor.
  - `section` is a thematic grouping, typically with a heading, and is *not* a generic styling container (use `div`).
  - `h1`–`h6` ranks.

## Per lesson

### web-html-elements · HTML ทำให้หน้าเว็บเกิดขึ้นได้อย่างไร
- **Concepts:** element = opening tag + content + closing tag; tags are not displayed; `h1` main heading; `p` paragraph.
- **Sources:** `mdn-basic-html-syntax`, `mdn-headings-paragraphs`.
- **Simplifications for beginners:**
  - The builder supplies the document skeleton, so `html`/`head`/`body` wait until HTML 4.
  - Heading size is explained as "the browser shows the main heading prominently". CSS is named as where size really belongs.

### web-html-text · ข้อความและโครงสร้างเนื้อหา
- **Concepts:** `h1`–`h3` hierarchy, one `h1`, no skipped levels; `strong` / `em`; every tag closed; inner tag closes first.
- **Sources:** `mdn-headings-paragraphs`, `mdn-basic-html-syntax`, `whatwg-html-syntax`.
- **Simplifications for beginners:**
  - Only `h1`–`h3` are taught, following MDN's advice to use few levels.
  - "Always close every tag" is taught even though the standard allows omitting `</p>` in some cases. This is recorded as a lesson limitation.
  - The missing-closing-tag example uses `h1`, whose end tag can never be omitted, and it really changes the parsed page: a real parser puts the next paragraph inside the heading. This is demonstrated live.

### web-html-links-images · ลิงก์ รูปภาพ และ Attributes
- **Concepts:** attribute `name="value"` in the opening tag; `a href`; `img src alt`; `img` has no closing tag; meaningful `alt` and link text.
- **Sources:** `mdn-basic-html-syntax`, `mdn-img-element`, `mdn-a-element`, `whatwg-html-syntax`.
- **Simplifications for beginners:**
  - Quotes are always required, although the standard permits unquoted values. This is recorded as a limitation.
  - Decorative empty `alt=""` is not taught yet: every lesson image is content, so every image needs a description.
  - The sandbox uses a fixed set of local pictures, and links never navigate.

### web-html-page-structure · โครงสร้างของหน้าเว็บ
- **Concepts:** `html`, `head` (+`title`), `body`; `header`, `main` (once), `section` (with a heading), `footer`, `div` as a last resort; `head` ≠ `header`.
- **Sources:** `mdn-structuring-documents`, `mdn-basic-html-syntax`, `whatwg-html-sections`.
- **Simplifications for beginners:**
  - `nav`, `article`, `aside` and other metadata are deferred.
  - `<!doctype html>` and `meta charset` are named in the limitations but not taught yet.

### web-html-project · Mini Project — หน้าเว็บแรกของฉัน
- **Concepts:** build a page from requirements using HTML 1–4: one `h1`, introduction text, an image with `alt`, a link with `href`, at least two sections inside `main`.
- **Sources:** `mdn-structuring-documents`, `mdn-img-element`, `mdn-a-element`, `mdn-headings-paragraphs`.
- **Simplifications for beginners:**
  - The check is structural only: wording quality, design and pixel sameness are not graded. Learners choose their own text, image and order.

## How correctness is enforced

- Every HTML answer in the knowledge layer has `verify: { kind: 'html' }`. `scripts/test-phase-76.js` parses each one with jsdom and checks its requirements on the DOM.
- In the app, the browser's own `DOMParser` is used; nothing is injected or executed.
- Tag-pair feedback (an unclosed tag, an overlap, `</img>`) comes from the learner's source tokens, because a real parser silently repairs these mistakes.
