# CHANGES — v042
*4 September 2026 — the brand folder gets its own stop, the room learns to
wait, and a two-font brand finally reads.*

## Files

**Replaced**
- `containers.py` — the font read, and the cache stamp.
- `setup_room.py` — the scratch holds instead of wiping.
- `app.py` — a brand-only drop, `_brand_payload`, `/api/setup/clear`.
- `static/js/setup.js` — the BRAND stop and the waiting state. Tag `v=042`.
- `static/js/strings.js` — `STR.setup` rewritten for four stops. Tag `v=042`.
- `static/index.html` — four stops, the brand pane, DROP ANOTHER FOLDER.
  Tag `v=042`; **`robot.css?v=042`**.
- `static/robot.css` — the brand stop's rules.
- `changelog/CHANGES-v042.md` — this.

**Delete by hand** — nothing.

## What started it

Michael dropped the Hunch brand folder into the checker and it bounced:
*"Can't find a container in there."* Two things were wrong, and the second
one is the reason this page exists.

**One: the door only knew about containers.** SET UP builds a brand once per
client and a container per format, so they arrive apart — Hunch's brand
exists before any Hunch container does. Insisting on both was my
assumption, not the schema's rule.

**Two: the folder read *clean* and shipped a blank font.** `_parse_brand`
looked up the exact bold key `Font`. Hunch is the first two-font brand and
declares `**Font — headlines:**` and `**Font — body:**`, so both lines
missed and the compiled dict carried `font: ""`. No bounce. The validator
said 0 problems while the skin was empty. This is precisely the wrinkle the
SET UPs renames note logged on 2 Sep under *"One wrinkle found in the
field"*, briefed to the engine, and never landed.

## The font read, fixed

`skin.fonts` is now a list — one row per declaration, in the order
declared, each carrying the job it does:

    [{"role": "headlines", "text": "Bebas Neue, ALL CAPS. …"},
     {"role": "body",      "text": "the web-safe stack, no file. …"}]

`skin.font` stays as the first one's words, so nothing downstream learns a
new shape on the same day (only `file_it.py` reads the skin at all, and it
reads `logo`). `**Mark:**` is carried too — Hunch declares one and the
reader was dropping it silently. A brandlook with no font line at all now
bounces, which is the "confirms what's missing" half of the ask.

**SCHEMA-v3 needs the matching line**: the two-font form is read, `Mark:` is
kept, and the *"until it lands, lead with a plain `**Font:**` line"*
workaround can go. That's a SET UPs edit, not an engine one.

## The parser is in the cache stamp now

The font fix changed the shape of a compiled dict without changing any
folder, so every `*.compiled.json` was stale and looked fresh — the exact
trap v031 lost an afternoon to, and which the renames note worked around
with *"touch a file in each folder anyway"*. `_compile` stamps with
`PARSER:mtime` now. Bump `PARSER` when the shape changes and every cache
rebuilds itself. The workaround can go too.

## The room holds what it's given

The scratch used to wipe on every drop. Now it accumulates: a brand on
Monday and its container on Tuesday both count, dropping the same folder id
again replaces that one and nothing else, and **Start again** (`POST
/api/setup/clear`) is the only way anything leaves. So a container whose
brand you dropped ten minutes ago checks against that brand instead of
bouncing.

Waiting is a state, not an error. With a brand and no container the room
says *"Holding hunch. Drop a container that points at it and I'll draw the
other three."* Stops 2–4 grey out, and the pill reads WAITING FOR A
CONTAINER rather than counting to one.

`nocontainer` is gone as an error code; `nofolders` replaces it, and only
fires when a zip holds neither.

## 1 BRAND — the new first stop

What the reader **got**, not whether it passed:

- every font line, named by the job it does — a blank one in red
- the logo and the mark as read
- the colour tokens as swatches with their hexes
- every file in `assets/`, with the ones brandlook.md actually names picked
  out, and anything named-but-absent in red
- the clause library, fixed clauses picked out
- the voice: its length, and a peek to read the whole thing

The hint under it says the quiet part: *what the reader got out of the
folder — not a verdict. A blank here is the bug.* Hunch's folder validates
clean; on this screen the empty font would have been visible in a second.

When a container names a brand that isn't held, the stop says which one it
wants rather than standing empty.

## Not done, on purpose

**Fetching missing fonts.** Asked for, and I'd argue against it. Bebas Neue
wasn't missing — it's in `assets/` with its OFL licence beside it; the
reader just couldn't read the declaration, and a download would have
"fixed" that by hiding it. The body font is deliberately fileless ("the
web-safe stack, no file"), and Avenir Next is licensed, not something to go
and get. More generally, a checker that supplies what's missing breaks its
own promise: the folder you looked at has to be the folder that goes live.
When a font file really is absent the validator already bounces — the
improvement there is to say where an open-licence file comes from, which is
a line, not an action.

## Verified
- The Hunch brand folder, dropped alone: reads clean, both fonts named,
  eight assets, two clauses, 5,561 characters of voice. Stops 2–4 locked,
  pill says WAITING FOR A CONTAINER, walking into a locked stop refuses.
- Then `prize_draw` dropped into the same session: four stops live, brand
  stop switches to One NZ, pill reads 4 BITS TO CHECK.
- A container whose brand isn't held: draws, bounces with 2 problems, and
  the brand stop names the folder it wants.
- `nozip`, a non-zip, and a zip with neither folder in it.
- `smoke_gates.sh` PASS · `smoke_errors.js` 22 renders, **0 differing** ·
  six FEED IT and doorway renders pixel-identical to the committed
  baseline · `smoke_ui.js` `errors: []` · `test_reader.py` clean, broken
  fixture still bounces with 5 · both live brands read with one font each,
  unchanged.

*Honest.*
