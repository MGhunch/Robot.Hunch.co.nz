# CHANGES — v022
*31 August 2026 — FEED IT opens up, and the dump zone gets three doors*

*Off `DUMP-brief.md`; `dump-mock.html` is the spec. Part A only — the form,
with SEARCH greyed. The wiring is hit list 9 and gets its own sitting.*

## Files

**Replaced**
- `static/index.html` — the concertina, the door as the gate, the dump zone,
  and the THINKING `<style>` block removed.
- `static/robot.css` — dump zone, the robot's short line, THINKING folded in,
  dead plate rules retired. **Cache tag bumped to `?v=022`** — the markup
  changed under it, so a stale stylesheet would look broken rather than old.
- `app.py` — the pad's placeholder copy, which turned out to live here.

**New**
- `changelog/CHANGES-v022.md` — this.

**Delete by hand**
- Nothing. The old plate markup was inline, so it's gone with the file.

## The concertina actually concertinas

All three stops open from the off. Wander forward, back, in any order. The
`FAR` high-water mark is gone, and with it the dead click on a locked stop
that gave no feedback at all.

A stop now reads `done` because it **holds something**, never because you
happen to be standing past it. Stop 1 counts the pad and any files, stop 2
counts the answers, stop 3 is `detailReady()`. The dump's button says DONE
rather than NEXT, because it declares a stop finished rather than pointing
onward.

## The door is the only gate

Every stop still has to be filled — that hasn't loosened, it's moved. Press
WRITE THE WORDS early and the robot names the stop that's short and opens
it. The line explains, the navigation solves:

- *Nothing to write about yet.*
- *Let's quickly bounce it first.*
- *Just need to check the deets.*

First one short, in journey order. The lines are the robot's own, so they
live in the front end beside the THINKING lines, never in `config.md`.

`alert("A couple of facts still need a tick.")` is gone — the one place in
the tool that spoke in OS voice instead of its own.

**One trap caught on the way.** Typed into the pad but never pressed DONE
and `blurb` stayed empty, so the WRITER would have had nothing — and the
background craft had already gone out against an empty source. The door now
takes the typed text and drops the stale craft. Without it, free navigation
would have quietly written copy about nothing.

## DUMP YOUR DOCS — three doors, one box

DOCS / WORDS / SEARCH above a single box. Whatever lands, whichever door,
is the same dump the FEEDER reads.

The discs are engine chrome, same family as the padlocks and the card
ticks, and they never reskin. Three states: **hollow** (nothing landed),
**has** (something's in that box, even closed), **on** (this box is open).
The `has` ring is the only tell for a closed door — no badges, no counts.

The box is solid at rest and never dashed; dashed red is reserved for a
live drag. Centred while empty, top-aligned and growing once anything
lands. Drag targets the whole card, so a file dropped while WORDS is open
flips to DOCS and lands there.

A landed file is a row: doc icon, name, tick. A file that wouldn't read
gets a hollow tick and one line underneath, in character, no apology. The
row also carries a quiet `×` — the brief didn't cover removal and the old
chips could be dropped, so it stays until told otherwise.

**SEARCH is hollow and can't light.** Tapping it says *"Can't go looking
yet. Paste it in for now."* Not "coming soon". When hit list 9 lands, this
disc is where LET IT DIG comes to live and the dig stub retires.

**The placeholder copy wasn't in `config.md`.** It was hardcoded in
`app.py`'s `_quiz`, so no container was overriding anything — the engine
was holding stale words. New defaults are in there. Which also means the
schema change the brief flagged isn't needed: the defaults already live in
the engine, and nothing ripples out to SCHEMA-v3.

## Fixed — THINKING showed on arrival

The beat was visible from first paint: a red band with the burger and no
words, because `thinkStart()` hadn't run to put a line in it.

`.think` sets `display:flex`, and `[hidden]{display:none}` is a *user
agent* rule — any author `display` beats it, so the `hidden` attribute did
nothing. `.think[hidden]{display:none}` now carries it.

Shipped in v021 and missed because the test asked the element whether it
was `hidden` (it said yes, truthfully) instead of asking the browser what
it was actually painting. Checked on computed style now.

**And the rule shouldn't have been called `.think` at all.** `.botdisc.think`
is the robot's thinking face — a whole existing family, shared by FEED IT
and FIX IT. A bare `.think` matched those spans too, so every face would
have blown up into a full-bleed red band the moment the bounce started.
The beat's classes are `.beat`, `.beat-bot`, `.beat-say` now, and the face
keeps the name it had first.

Cache tag to `?v=023`. The `[hidden]` fix went out under an unchanged
`?v=022`, so browsers that had already loaded the Drop Zone stylesheet kept
serving it — the fix was deployed and invisible.

## Housekeeping

THINKING's rules move from an inline `<style>` in `index.html` into
`robot.css` under their own block. That block only existed because the
stylesheet was mid-sync across two machines; it isn't any more.

`.picdrop`, `.pichead`, `.picsub` and `.fd-pad` retired — nothing had
referenced them since the plate went.

*Honest.*
