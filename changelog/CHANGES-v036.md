# CHANGES — v036
*2 September 2026 — the rooms become files. Step 3 of the front-end
refactor, first half: the cut. Nothing changes on screen.*

*`index.html` was the markup and four rooms in one `<script>`. Now it's
the markup and seven script tags. The front end has the back end's shape:
a shell, a door, the rooms, and one file that knows a sandwich has started.
The renames are the second half — v037 — and want Michael's eye on one
thing first.*

## Files

**New**
- `static/js/sandwich.js` — one execution: `CONT`, `CID`, `RUN`,
  `enterRoom()`, and the two questions only the sandwich can answer —
  `assetFresh(v)` and `briefMoved(v)`. The only file allowed to know every
  room exists.
- `static/js/door.js` — the magic word, the guess ladder, the doorway.
- `static/js/feed.js` — the concertina, the checklist, the dump, search,
  the FEEDER, the terms, the craft, the brief, WRITE THE WORDS.
- `static/js/fix.js` — the asset, the plate, the gutter, the rail, the
  threads, the drawer, the FIXER, `fxFail()`, `fxFinalCopy()`.
- `static/js/file.js` — the fillings, WRAP IT, the files.
- `smoke_gates.sh` — the church-and-state gates as a script. Run it; it
  exits non-zero when any file names another's element or reads another's
  state. Comments are stripped first, so prose is free.
- `changelog/CHANGES-v036.md` — this.

**Replaced**
- `static/index.html` — 355 lines, markup only, plus the script tags. Down
  from 2,310.
- `static/js/chrome.js` — gains `ready()` (run now or on DOMContentLoaded)
  and the shell's menu — the burger, ABOUT, the FAQs — which sits on every
  room and is therefore furniture. Cache tag to `v=036`.

**Delete by hand**
- Nothing. `strings.js` is untouched (`v=034`). No Python, no CSS.

## The cut, and the three things it moved to the right place

The cut followed the v035 gates almost exactly: the door up to `doorway`,
FEED IT from the checklist to `buildIt`, FIX IT from `THE ASSET` to
`fxFinalCopy`, FILE IT to the end. Three things weren't clean at the seam:

**The plate card was FEED IT's.** `buildIt()`'s failure path cleared FIX
IT's gutter and rail and drew the card into FIX IT's slot — FEED IT
reaching across the wall to paint the other room. Now `fxFail(retry)` in
`fix.js` does that; `buildIt` calls it. Same pixels; the room owns its own
failure.

**Staleness was FEED IT's.** `dirty()` read `ASSET` to decide whether the
asset was stale, and `buildIt` read it to skip a rewrite. Whether the
brief and the asset agree is nobody's business but the sandwich's — so
`assetFresh(v)` and `briefMoved(v)` live in `sandwich.js`, and FEED IT
asks. Its gate now includes `ASSET` and stays clean.

**The shell's menu lived at the bottom of the rooms.** It's on every
room, so it's chrome. It waits for the DOM now, because chrome loads in
the head — the same lesson as the face fill in v034.

**Load order:** `tokens.css → robot.css → strings.js → chrome.js` in the
head; `sandwich.js → door.js → feed.js → fix.js → file.js` where the inline
script sat, so top-level code still runs after the markup exists. Classic
scripts share one global scope, so nothing is exported or imported; the
gates are what keep the files honest, not the loader.

**Handovers, named.** A room may call the next room's entry point:
`enterRoom` (sandwich) → `clInit / clRender / quizInit` (FEED IT) and
`fxTabs` (FIX IT); `buildIt` (FEED IT) → `fxInit / fxFail` (FIX IT);
`fxWrapGo` (FIX IT) → `toFileIt` (FILE IT). Those calls are the doors
between rooms, and they're the whole list.

## Not renamed — on purpose
`FD_ROBOT` still wears FEED IT's prefix inside the chrome; `.fd-said` is
still the line's class; `COPY`, `CTX`, `FACTS`, `FXLOCK`, `FXLIST`,
`FXFLAGS`, `PICK`, `TWEAKS` are still views onto `ASSET`; `EXTRACTED` and
`EXTRACTING` are still assigned in `enterRoom` and read nowhere. v037.

## Verified — zero visible change
- `smoke_errors.js`: 22 renders on v035 *as committed* (byte-checked
  against the repo), 22 on v036, pixel-identical — twice.
- `smoke_ui.js`: output identical to v035, line for line, to the point
  where it stops (the old `one_update` reason).
- `smoke_gates.sh`: every file clean.
- Seven files parse alone and concatenated; no page errors in the harness.

## What's next
v037, the renames. One decision for Michael first: three ticks and two
pencils can't be folded into one of each without a visible change (the
stroke widths differ). Fold them and accept a knowing diff, or leave them
as five and stop calling it a rename.
