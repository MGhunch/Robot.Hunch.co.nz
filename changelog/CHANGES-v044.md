# CHANGES — v044
*4 September 2026 — SET UP gets a home page, and folders get somewhere to
live while you work on them. Drop a zip, edit, check, and it waits for you.*

## Files

**Replaced**
- `setup_room.py` — drafts, on the volume, one folder at a time.
- `containers.py` — the reader looks in two places.
- `app.py` — the list, the drop, opening one, discard, and push's honest no.
- `static/js/setup.js` — the home page and the folder, rebuilt.
- `static/js/strings.js` — `STR.setup` for two places. Tag `v=044`.
- `static/index.html` — the room, rebuilt round the list.
  **`robot.css?v=044`**.
- `static/robot.css` — the SET UP block, rewritten.
- `changelog/CHANGES-v044.md` — this.

**Delete by hand** — nothing.

## Two places, and the difference is the whole model

    the volume   a DRAFT. Instant saves, no deploy, Hunch's eyes only.
                 Survives restarts and redeploys.
    git          what has LANDED. History, revert, and the folders ship in
                 the same commit as the engine that reads them.

**Clients only ever see git. Hunch sees the volume laid over the top.** One
sentence, and it settles every awkward case — an unpushed edit can look
wrong to you and can't reach anybody else.

`containers.py` reads git as the floor and the volume over it, marking what
came from where. `brands(drafts=True)` and `containers(drafts=True)` are the
only way to see a draft, and only `is_hunch()` asks for it.

### Why not the volume as the source, and why not a database
A database would mean rewriting the reader — it's `open()` and
`os.listdir` — or writing files out of a database on boot, which is a cache
with extra steps. And the content is markdown documents full of prose,
comments and tables the reader carries through untouched. SCHEMA-v3 already
ruled on this.

The volume as the *source* was the original SET UP CHECK spec, with "commit
a zip on flip day" as the backup. One disk, no history, no undo, and a habit
doing a seatbelt's job. The volume is right for work in progress, which is
not the same thing as being the source.

**And it fixes a bug shipped in v043**: drafts lived in `/tmp`, which
Railway wipes on every restart. Twenty minutes of editing could vanish with
no warning.

## The home page

One pad — the zip already says whether it's a brand or a container, and
asking first is asking a question we can answer ourselves. Two columns,
because they're two jobs. A row is three things: the state as a word at the
front so the column scans, what it is, and **EDIT**.

The list does not push. Push has to refuse a folder that doesn't read clean
and a list can't know; and the doorway picks a container, it doesn't write
the copy. **The list navigates; the room acts.**

A dropped folder arrives as a card at the top of its column, in DRAFT.

## Opening is free; the first edit is the checkout

Click EDIT on something live and you're looking at what's in git. Nothing
has changed. The moment you edit a field, `draft_dir(..., make=True)`
copies the folder to the volume and writes there — copy on write. So
looking at a live brand doesn't litter the list with a draft you didn't
mean to make, and the live one carries on serving clients while you fiddle.

**Discard** throws the draft away; what landed is untouched. That's the
whole point of the copy.

## Three sections, not five

Split by file, because a section spanning two files makes "which file did
that change?" a question you re-answer every time:

| Section | File(s) |
|---|---|
| **LOOK** | `brandlook.md` + `assets/` |
| **PROMPT** | `brandvoice.md` |
| **LEGALS** | `brandlegals.md` |

v043's five split `brandlook.md` three ways, which put the font *line* and
the font *file it names* on separate screens — and seeing those two
together is the entire lesson of the Bebas bug. LOOK holds both halves now.

LEGALS stays its own section rather than joining PROMPT: the voice is prose
you rewrite freely and the robot interprets; a clause lands verbatim and has
legal weight. Same screen and you'd eventually edit one like the other.

## PUSH says the honest thing

It lives in the room, bottom right, where GOOD TO GO always has. It's dead
unless the folder is a draft, every stop is checked, and the validator finds
nothing — and the label says which of those is missing rather than just
greying out. Pressed when it's ready, it reports that there's nowhere to
push to yet. **v045 gives it a GitHub token and the files-not-zips commit.**

The download is still there and still the safe path.

## What Railway needs
A volume mounted at `/data` and nothing else — `ROBOT_DRAFTS` defaults to
`/data/drafts` when `/data` exists, and falls back to `/tmp` locally where
losing a draft costs nothing. Set `ROBOT_DRAFTS` explicitly if the volume
lands somewhere else.

## Verified
- The home page, live: three brands and two containers, states right, a
  dropped brand landing at the top as DRAFT.
- **Copy on write**: opened a live brand, looked, left — still LIVE. Edited
  one colour — DRAFT, and the list agrees. Client's view of `one_nz`
  unchanged throughout (`/api/container/prize_draw` still green `#1B7C53`
  while the draft was something else entirely).
- Discard put it back to LIVE.
- PUSH: *3 BITS TO CHECK* → *PUSH* → *"Nowhere to push to yet."*
- The container side: three stops, `NOTHING TO PUSH` on a landed one.
- A peek opens without the burger reappearing behind it.
- `smoke_gates.sh` PASS · `smoke_ui.js` `errors: []` · `test_reader.py`
  clean, broken fixture bounces with 5 · six FEED IT and doorway renders
  pixel-identical to the committed baseline.

### One view in `smoke_errors.js`, and it isn't a change
`05-doorway-tile-fail` differs by a one-pixel shift of a single arrow disc.
Chased it properly: the element's rect, computed style, font stack and text
are identical to two decimal places on both builds. Then the decisive test —
**base engine with the new front end matches the baseline, and the new
engine with the old front end matches the baseline; only the two together
differ.** A real cause would show in one half. It's paint timing, the third
artefact of this class the harness has produced today. Noted rather than
hidden, and not worth another hour.

## Still not done
The robot can't edit anything — the composer says so. The container side is
read-only. DEETS still renders empty, which needs reference facts, which
needs SCHEMA-v3 to define them.

*Honest.*
