# CHANGES — v021
*31 August 2026 — THINKING, and two FAQs*

*Off `THINKING-brief.md`; `thinking-mock.html` is the spec. Built on the
index that came back from Michael's machine, so the `chat-*` class
consolidation is carried through, not reverted.*

## Files

**Replaced**
- `static/index.html` — THINKING (markup, style block, lines, the
  hand-off), plus the two FAQs written in the same sitting.
- `smoke_ui.js` — selectors caught up with the `chat-*` rename.

**New**
- `changelog/CHANGES-v021.md` — this.

**Delete by hand**
- Nothing. The old interstitial was inline, so it's just gone.

**Not touched**
- `static/robot.css`. THINKING's rules ride inline in `index.html` for
  this cut only, because the stylesheet is mid-sync between two machines.
  Fold them into `robot.css` under their own block at the next sync and
  delete the `<style>` block. The `?v=020` tag is unchanged for the same
  reason — no stylesheet change, nothing to bust.

## THINKING

The beat between FEED IT and FIX IT while the WRITER runs. Not a room, a
moment: it sits where the panes sit, so the engine bar and the stepper
are untouched — FEED IT still on, FIX IT still unlit. `reach(1)` doesn't
fire until the draft is in hand.

Red room, the burger centred at `min(120px, 30vw)`, a 2.6s bob. One line
in Bebas underneath, landing from above with a small overshoot, holding
2.6s, dropping out as the next one lands. Eleven lines, sequential,
looping if the wait outlasts the list.

No label, no progress bar, no dots, no percentage, no ellipsis. Status is
an event, not a meter.

The mock's blink and antenna flash are gone, as the brief called: they
need separate shapes and `robot-burger.svg` is one path. The bob is the
whole performance.

`prefers-reduced-motion` drops the bob and swaps the lines without
animation.

## The hand-off

`armCraft()` already starts the WRITER the moment the facts are ticked,
so the draft is often back before the beat begins. Two rules hold it
together:

- **Out the instant it lands.** No "done" beat, no waiting for the
  current line to finish its hold.
- **A one second floor.** Otherwise a draft that was already sitting
  there strobes the screen on its way past.

A WRITER failure goes to the existing surface, unchanged — out of the
beat, into FIX IT, the error where it always was. `fxLoading()` and
`genCopy()` are gone; the flow they served is now one path through
`buildIt()`.

## The FAQs

Two more, taking the list to eight.

- **"Who's on the block if it all goes wrong?"** — placed second, right
  behind "won't go off on one". Same argument at two depths: the first
  promises a human in every loop, this one cashes it.
- **"How does the robot learn?"** — placed immediately above "will the
  robot spill my secrets", so the notebook is named before the
  reassurance lands rather than after. This is most of hit list 24; the
  log is now disclosed as the feature it is.

*Honest.*
