# CHANGES — v027
*1 September 2026 — the ticks finally go somewhere, and the search learns
one grammar*

*The fix that mattered: ticked facts were collected, approved, and then
went nowhere. Plus the consistency pass on SEARCH's two screens. This zip
supersedes v024–v026 if none have been uploaded; all changelogs ride
along.*

## Files

**Replaced**
- `static/index.html` — the dump mirror, opt-in tickable queries,
  GO DIGGING centred in the flow, the two Bebas subheads, DONE hidden
  mid-search, the barred card gone. **Cache tag `?v=027`.**
- `static/robot.css` — `.sr-sub`, `.sr-dig`, the barred and `.sr-plain`
  rules removed with their wearers.

**New**
- `changelog/CHANGES-v027.md` — this.

**Delete by hand**
- Nothing.

## The dump stops being a snapshot

The bug: DONE copied the dump into the hidden field the robots read
from, once, and nothing ever refreshed it. Tick a fact after DONE — or
search at all after first pressing it — and the facts reached nobody.
The extraction ran once on the stale copy too. Collected, approved,
gone nowhere: the exact failure Michael hit.

Now the hidden field is a mirror, not a snapshot. Every redraw of the
dump card — a fact ticked, a doc landed, words typed — rewrites it from
`fdDumpText()`, so the FEEDER's every move, the WRITER's source, and
the background craft all read the dump as it stands, whatever order
things happened in. DONE is navigation now, not the courier. The craft
cache already keys on the dump's content, so a late fact invalidates a
stale pre-craft by itself.

**Tested, not assumed.** Headless Chromium with the API intercepted,
fifteen assertions: the FOUND lines (fact + source) arrive in the
feeder's move-one dump; a fact ticked *after* DONE lands in the
robots' field with no second DONE; late words too. The sneaky path is
the one that was broken, so it's the one the test walks.

## Tick what we dig for

The proposed searches were bin-to-remove — every one ran unless you
shot it. Now they arrive **unticked**, wearing the same tick furniture
as the facts: opt in, and only what you chose is spent. Nothing runs
that wasn't waved through, which is the confirm screen finally meaning
what it always claimed. Screen one teaches screen two: tick what we
dig for, tick what's handy. The × and `srDrop()` are gone.

GO DIGGING replaces the footer SEARCH button, centred in the flow it
commits, hollow (`dormant`) until at least one search is ticked — the
button teaches the rule. It also stops wearing the same word as the
door above it.

## The card says where you are

Two subheads, Bebas in ink — a section signal sitting between the red
title's register and the body's. **WHAT SHALL WE DIG FOR?** over the
plan: a genuine question, because with opt-in ticks the ticks are how
you answer it. **TICK WHAT'S HANDY** over the facts — "Here you go"
was throat-clearing and died.

DONE now hides during plan and looking: mid-search the card holds
exactly one decision. It returns when facts land or you're back at the
ask. This also retires the edge where two solid red pills could share
the footer.

## The dud is gone

The struck-through price card — "Not mine to quote" — performed the
robot's restraint at the end of every search to make a point worth
making once. Michael's call: we don't perform the rules. The server
still bars every price (`_MONEY` is untouched); the front end just no
longer renders the refusal. The barred styling and `SR_BARRED` state
went with it.

*Honest.*
