# CHANGES — v040
*4 September 2026 — SET UP CHECK. A fifth room, and the two lifts that made
it honest.*

## Files

**New**
- `static/js/deets.js` — the checklist, lifted out of `feed.js`. A renderer
  two rooms share.
- `static/js/setup.js` — the SET UP CHECK room. Prefix `setup-*`.
- `setup_room.py` — the upload door: a dropped zip, unpacked to scratch.
- `changelog/CHANGES-v040.md` — this.

**Replaced**
- `static/js/feed.js` — 649 lines lighter. The checklist and the ghost left;
  what stayed is the concertina, the dump, the search door, the chat and the
  brief. Tag `v=040`.
- `static/js/chrome.js` — gains `GHOST` (the ghost drawing) and
  `menuAdd/menuHunch` (the burger's extra doors). Tag `v=040`.
- `static/js/sandwich.js` — `deetsReset()`, `feedDeetsMount()`, and
  `enterSetup()`. Tag `v=040`.
- `static/js/door.js` — one line: tells the menu who signed in. Tag `v=040`.
- `static/js/strings.js` — `STR.setup`. Tag `v=040`.
- `static/index.html` — the SET UP room's markup, the script tags, and the
  ghost's class. Tag `v=040`; **`robot.css?v=040`**.
- `static/robot.css` — the ghost's classes renamed, the SET UP block added.
- `app.py` — `_container_payload()` factored out; `/api/setup/check` and
  `/api/setup/asset/<path>`.
- `containers.py` — `folders_at()`, so the reader can read a folder that
  hasn't landed.
- `Procfile` — `--workers 1`.
- `smoke_gates.sh` — rows for `deets.js` and `setup.js`; the checklist's
  state moves out of FEED IT's column into its own.
- `smoke_ui.js` — the ghost's class.

**Delete by hand** — nothing.

## What it is

Hit SET UP in the burger. Drop the zip SET UP hands back — the brand folder
and the container folder. The engine draws the container three ways before
it lands:

- **1 MOCK UP** — the ghost, off the html's `data-module` tags.
- **2 DEETS** — the checklist, empty, as the client first meets it.
- **3 OUTPUT** — `container.html` itself, in a frame, at full height.

A padlock per stop, shut when you've looked; three shut and GOOD TO FLIP
tells you the word to change in `config.md`. It flips nothing — landing a
container stays a deliberate act by a human in the folder.

The point of the room is that you can eyeball the exact mock, the exact
deets and the exact output **without running a brief through the machine**.
No model is called anywhere in it. Same folder, same page, every time — so
what you're looking at is the container, not the robot's mood on the day.

## The two lifts, and why they weren't optional

**The checklist moved to `deets.js`.** `smoke_gates.sh` forbids a room
reaching into another room, and the card was ~590 lines inside `feed.js`.
SET UP could have grown its own copy — and then the check would render
something FEED IT doesn't, which is worth nothing. So the card is a
renderer two rooms share, mounted by whoever wants it:

    deetsMount(el, { changed, armed, refused, dig, rendered })

The card asks its host for those five things and never knows which room
answered. FEED IT answers with `dirty()`, `deetsArm()`, a line at stop 2,
the SEARCH door and `feedStages()`. SET UP answers with almost nothing —
which is the read-only version, without a read-only mode existing.

`TERMS_MENU` and `TERMS_CHOSEN` went with it; the brief asks through
`deetsChosen()` rather than reaching in. This is `CODE-HOUSEKEEPING.md`
item 5, done at the moment it recommended: the next time the checklist
needed real work. `feed.js` is 1,324 lines → 675.

**The ghost moved to `chrome.js`.** Same argument: FEED IT draws it beside
the concertina, SET UP draws it to check the bones, and they have to be the
same drawing. It takes its data now (`GHOST(el, tags, mods, checklist)`)
rather than reading `CONT`, so the chrome still knows no container exists.
Its classes took the chrome's word with it: `feed-g*` → `ghost-*`, thirty-one
rules. The root is `.ghost-art`, not `.ghost` — see below.

## The architecture question, answered by the loop

Where the dropped folders live was the open decision. The loop settles it:
*you* upload the folder, so the page never touches a live container. The zip
goes to `/tmp/robot-setup/<session>`, `containers.py` reads it there through
`folders_at()`, and `brands/` and `containers/` never move. Nothing to back
up, nothing to lose, no source of truth inverted. The worst a bad zip can do
is fail to render.

`folders_at()` swaps module state for the length of one call, which assumes
one process — so the Procfile now pins `--workers 1`, which
`CODE-HOUSEKEEPING.md` item 1 wanted anyway. It's a line of code and a line
of comment in `containers.py` saying what breaks if that ever changes.

The zip is treated as a stranger: absolute paths, `..` and symlinks are
refused, 400 files, 8MB each, 40MB the lot. Folders are found by looking
(a folder holding `config.md` and `spec.md` is a container; one holding
`brand.md` is a brand), so the zip can be shaped however SET UP zipped it.

## What it can't do yet

The composer is on screen and disabled, and says so: *"I can't change the
files yet — v041."* A live-looking box that did nothing would be worse than
an honest dead one. The robot editing the folder, the changelog line and the
undo are the next zip.

There are no reference facts, so DEETS renders empty — TBC in every pill,
`…` in every clause. That was the decision: you can't check live data
without live data, but you can absolutely check the shape, and the shape is
what a container gets wrong.

## Found by the render

**`.ghost` was already taken.** Renaming `feed-ghost` to `.ghost` collided
with `.chat-cav.ghost`, the muted avatar in the chat — every hidden avatar
quietly took a white background and a shadow. Invisible in the eye, five
pixels deep in the diff, caught by the pixel-diff on the door. The drawing
is `.ghost-art` now.

**The door's diff that wasn't.** A door render differed by ≤7 in one
channel across the two tiles, run after run. It was the tiles' entrance
animation caught mid-flight at a 900ms wait, not a change — 2500ms and it's
identical. Worth writing down: the harness needs the animation *finished*,
not merely started, or it invents a bug a day.

## Verified
- `smoke_gates.sh` — seven files, ids clean, state clean. GATES PASS.
- `smoke_errors.js` — 22 renders, before and after, **0 differing**.
- FEED IT, both containers, empty and filled, plus the doorway — six
  full-page renders, pixel-identical.
- `smoke_ui.js` — both containers to a poured FIX IT, `errors: []`.
- `test_reader.py` — both folders clean, the broken fixture bounced with 5
  reasons. `containers.py` — both containers and both brands read clean.
- The room itself, driven end to end: a clean folder (three stops, padlocks,
  GOOD TO FLIP), a folder that bounces (14 problems named, still draws), a
  file that isn't a zip, and no file at all.

## One thing that was already broken
`test_engine.py` fails on `main` and fails here, identically: *"Tickets is
blank."* The fixture predates the `tickets` row on the prize card. Not
touched — it's a fixture to fix, not a bug to hide, and it wasn't this
zip's job.

*Honest.*
