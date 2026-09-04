# CHANGES — v043
*4 September 2026 — SET UP becomes two doors, and the brand becomes
editable. Upload the zip, edit, prune, check, make it right, download the
finished zip. Done.*

## Files

**New**
- `setup_edit.py` — the four surgical edits and the changelog line.
- `changelog/CHANGES-v043.md` — this.

**Replaced**
- `static/js/setup.js` — two doors, five brand sections, the edit
  mechanics, the pills that show what they point at. Tag `v=043`.
- `static/js/strings.js` — `STR.setup` for two jobs and the writer's
  refusals. Tag `v=043`.
- `static/js/chrome.js` — `shadeOpen()` split out of `menuOpen()`.
- `static/index.html` — the room, rebuilt round the two doors.
  **`robot.css?v=043`**.
- `static/robot.css` — the SET UP block, rewritten.
- `app.py` — `/api/setup/held`, `/edit`, `/asset/add`, `/asset/drop`,
  `/download`; `_brand_payload` in five sections.
- `setup_room.py` — assets in and out, and the way out.
- `containers.py` — `sections_of()`, public, so the page can read a voice
  by section.

**Delete by hand** — nothing.

## Two doors, because they're two jobs

v042's room had one rail: a brand stop followed by three container stops,
plus a "waiting" state that existed purely because the room couldn't tell
which job it was on. Michael, on being handed it: *"Currently we're trying
to do both at once and it's confusing me and the robot."* He's right, and
it was confusing me too when I wired the padlocks.

- **SET UP BRAND** — one per client. Fonts, assets, colours, legals,
  prompt. Checkable *and editable*; you take the folder away at the end.
- **SET UP CONTAINER** — one per format, against a brand that already
  exists. The mock, the deets, the output, as built.

**You can't have a container without a brand; you can set up a brand
without a container.** That asymmetry is the navigation. The container door
opens by saying what the room is holding, and says so plainly when there's
no brand in it yet. The waiting state is gone — you pick the job at the
door instead of the room guessing.

## The brand, in the five sections you'd change it in

**FONTS** — the font files in the folder *and* the lines that name them.
Both, always. The reader doesn't read files, it reads the lines; a font
sitting in `assets/` that no line names is invisible to the engine, and
that is exactly what happened to Bebas Neue in the Hunch folder. A list of
files alone would have hidden it.

**ASSETS** — everything else, with three states you can see: named and
present, named and absent (bounces), present and never named (the engine
will never touch it — Hunch's Book of WHO PDF). Tap one and it *shows*: an
SVG renders, an image renders, a font draws a specimen line in its own
face, which is the only way to catch a wrong weight.

**COLOURS** — swatches with editable hexes. Only the hex is read, so only
the hex is editable; the client's name for the colour, its RGB and its CMYK
stay exactly as written.

**LEGALS** — the clause library, the client's own words, pulled into
containers with `@brand`. Editable in place.

**PROMPT** — `brandvoice.md` by section. WRITER still eats the whole file;
the sections are how you read and rewrite it, not a change to what it gets.

## The rule the editing obeys

**Edits are surgical. Never regenerate a file.** Replace the hex inside its
line. Replace one `**Key:**` line. Replace the body under one `##` heading.
Replace one cell of one table row. Everything else — the comments, the
ordering, the prose the schema deliberately carries through for humans, the
blank lines someone put there on purpose — comes out untouched. Measured:
editing two things in Hunch's brandlook changed **2 lines of 23**.

Every save re-reads the folder and answers with the parse, so the page never
holds its own idea of what the file says. The validator runs again each
time and reports in the chat: *"Saved. Re-read clean — no problems."* or
the count. Every edit adds a dated line to brand.md's changelog and bumps
the version a point, so a folder that's been fiddled with says so.

## Gaps get asked for, not invented

A file brandlook.md names and hasn't got is a bounce, and now also an
upload slot — *the checker recognises we don't have it, asks, and you put
it in*. What it will never do is go and find one. Bebas wasn't missing, it
was unreadable; a download would have "fixed" that by hiding it. And a
checker that supplies what's missing breaks its own promise, which is that
the folder you looked at is the folder that goes live.

## The way out

**TAKE THE FOLDER** downloads everything held, in the shape the reader
accepts, minus the compiled caches. It ships in the same version as the
first editable field on purpose: a folder you can edit but can't take away
is a folder you shouldn't have been allowed to change. Round-tripped in
testing — download, re-drop, reads clean with every edit intact.

The container job still ends the old way: GOOD TO FLIP names the word to
change in config.md and leaves the changing to a human.

## Found by pressing it

**The colour swatches did nothing, silently.** `JSON.stringify(key)` went
into a double-quoted `onchange` attribute, so the attribute ended at the
first quote of the key. The handler was there; the argument wasn't. One
`attr()` helper now does that escaping in all four places it was
hand-rolled.

**The burger reappeared behind every preview.** `menuOpen()` toggles the
menu shut on the way in — right when you came *from* the menu, wrong when a
button on the page raises a shade, because the toggle opens it instead.
`shadeOpen()` is the modal on its own; `menuOpen()` is now that plus
shutting the burger. Same bug class as v041's double toggle, opposite
direction.

## Verified
- Both doors, driven end to end in a browser: a colour edited and saved
  (and a bad hex refused in the robot's words), a font line rewritten, a
  voice section rewritten, a font specimen and an SVG previewed, a named
  file pruned (*bounces, loudly*) and added back (*clean*), all five
  padlocks shut, folder downloaded, re-dropped, still clean with every edit
  in it.
- The container door with a brand held: three stops, `GOOD TO FLIP`.
- The container door with nothing held: says so, on the pad, before you
  waste a drop.
- `smoke_gates.sh` PASS · `smoke_errors.js` 22 renders, **0 differing** ·
  six FEED IT and doorway renders pixel-identical to the committed
  baseline · `smoke_ui.js` `errors: []` · `test_reader.py` clean, broken
  fixture bounces with 5 · both live brands unchanged.

## Still not done
The robot can't edit anything — the composer says so, in place of a live
box that would do nothing. The container side is read-only. And DEETS still
renders empty, which needs reference facts in the folder, which needs
SCHEMA-v3 to define them.

*Honest.*
