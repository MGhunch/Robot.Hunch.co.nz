# CHANGES — v024
*1 September 2026 — the search shows its working, and the field stops
leaving the room*

*Two complaints from using SEARCH in anger: the first wait gave you
nothing, and there was no honest way back when the answers were wrong.
Frontend only — `/api/search` is untouched.*

## Files

**Replaced**
- `static/index.html` — the arrow spins while the plan is fetched, the
  ask field stays on screen at every stage, ticked facts survive a
  re-search, and the ghost SEARCH button is gone along with `srAgain()`.
  **Cache tag bumped to `?v=024`.**
- `static/robot.css` — the spin keyframes, the disabled field, the
  list's new gap under the field, and the `.fd-go.ghost` rule removed
  with its last wearer.

**New**
- `changelog/CHANGES-v024.md` — this.

**Delete by hand**
- Nothing.

## The first wait was silent

Type a subject, hit the arrow, and for the second or two the plan call
took, nothing moved. The arrow went pink — which is the *can't* colour,
not the *busy* one — and the card just sat there. The looking stage
further in had its thinking head and its ticking rows; the ask stage,
the very first thing anyone touches, had less feedback than any other
wait in the app.

Michael's fix, and the right one: the arrow rotates like a clock hand.
`thinkFace()`'s own comment already settled the principle — the first
loading motion has to be "the loading gesture everyone already knows",
a full rotation. So `.sr-arrow.spin` turns the arrow through 360° on a
1s loop until the queries land, and it **stays red while it turns**:
pink means can't, motion means busy. Two meanings, kept apart.

## The field never leaves now

The ask field used to vanish the moment the plan appeared. If the three
proposed searches were off, your moves were binning them one by one
(until the last × dumped you back at ask) or — after results — finding
out that the hollow SEARCH button secretly meant *start again*. A
restart disguised as the thing it restarts.

Now the field simply stays, at every stage, holding what you typed.
Wrong queries? Retype and hit the arrow — fresh plan. Duff results?
Same move. The field *is* the way back, which means it's also always
visible what the current search was about. During the looking stage it
greys and locks, because changing the subject mid-search would be a
promise the call can't keep.

That made the ghost button redundant, so it's gone — `srAgain()`,
the `.ghost` styling, and the two-jobs-one-button ambiguity with it.
The SEARCH button now appears only when there's a plan to commit,
does one thing, and disappears once the results are in. The big
decorative magnifier still bows out after the ask, as before — the
`filled` class was already doing that job.

## Ticked facts ride along

Re-searching used to be scorched earth: the old hits went, and with
them anything you'd ticked — worse, `srTick` would silently rebuild
the dump from only the new round, so facts you'd chosen could drop
out without a word. With the field as a standing invitation to go
again, that bug was about to get promoted from latent to daily.

Now anything ticked when you re-plan is stashed (`SR_KEPT`), and when
the next results land it comes back **at the top of the list, still
ticked** — visible, and untickable if you've changed your mind, rather
than invisibly welded into the dump. New facts that duplicate a kept
one are folded in rather than listed twice. Search three times, keep
one fact from each round: all three are on the plate at DONE.

## Verified

Rendered in headless Chromium with a stubbed API, same drill as v023:
ask, spin, plan, looking, hits, then a second round. The screenshots
confirmed the spin runs red, the field persists and greys at looking,
no button survives into hits, and round two came back with round one's
ticked fact first and pre-ticked. `SR_KEPT` drains after each landing,
so the state can't compound.

*Honest.*
