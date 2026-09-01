# CHANGES — v023
*1 September 2026 — the landing zone stops wobbling, and the concertina shuts*

*A format pass on stop one plus one behaviour fix. No copy changes, no new
furniture — the doors, the plate and the discs are all as v022 left them.*

## Files

**Replaced**
- `static/index.html` — `accToggle()` added, the three stop heads pointed at
  it, DONE's dormant class, and an empty-DONE guard. **Cache tag bumped to
  `?v=023a`** — see the note at the bottom.
- `static/robot.css` — the nudge's measure and size, the hint's size, the
  doors' bottom margin, and the dormant DONE.
- `containers/prize_draw/config.md` — the nudge copy, cut to one line.

**New**
- `changelog/CHANGES-v023.md` — this.

**Delete by hand**
- Nothing.

## The measure was the wobble

`.dump-nudge` had no `max-width`, so the container's own line — "Briefs,
emails, legals, whatever…" — ran the full 575px of the card at 11.5px.
About a hundred characters a line, centred, both edges ragged. Small type
on a long measure is unsettled type, and it was the loudest thing wrong
with the card.

Capped to `42ch` and centred as a block. Everything else below is smaller
than that fix.

## The hierarchy was upside down

The nudge was 11.5px. The hint inside the box — "Browse or drag it in." —
was 12.5px. So the line telling you *what to dump* was set smaller than the
line telling you *how to drop it*, and the card argued with its own meaning.

Nudge to 13px, hint to 12px. The order now matches the importance.

## Nothing belonged to anything

Doors `margin-bottom:14px`, nudge `margin-bottom:12px`, foot `padding-top:8px`
— three near-identical gaps, so the card read as four loose bands rather than
two groups. The nudge is the *selected door's* line and belongs to the doors,
so it's been pulled up under them (doors to 6px) and the plate pushed off
(nudge to 18px).

Alignment was left alone. Header-left over body-centred looked like a fight
while the nudge sprawled; capped to two tidy lines it reads as an ordinary
card and doesn't need solving.

## DONE stopped promising

Empty plate and ready plate had the same fully-saturated red button. DONE is
now hollow until something lands — `.fd-go.dormant`, toggled from
`fdDumpDraw()`, which is already the one place that knows.

It's a class and not `:disabled` on purpose: `:disabled` belongs to the
thinking state, which sets it on the same button while the FEEDER runs. Two
meanings on one attribute would have collided.

And it means it. `fdDumpNext()` used to happily send an empty dump; it now
stops and lets the robot say so, in its own existing words — `FD_SHORT[0]`,
"Nothing to write about yet." No new copy.

## All three stops can be shut

`acc(i)` did `ACC=i` unconditionally, so clicking an open stop's head just
re-opened it. There was no closed state at all.

`accToggle(i)` — `ACC = (ACC===i ? -1 : i)` — now sits on the three heads.
`ACC=-1` means nothing's open, and `fdStages()` already falls through to
`done`/`todo` for every stop that isn't `ACC`, so all three shut with no CSS
at all. The chevron only rotates on `.on`, so they all point down.

`acc()` was deliberately left alone. `accReach()` calls it to move you
forward through the flow, and if the toggle lived inside `acc()` then
`accReach(1)` on an already-open stop 1 would have *closed* it. The two
verbs stay separate: `acc()` opens, `accToggle()` toggles.

## The nudge said it three times

Copy, not code, so it lives in `containers/prize_draw/config.md` under
*What a good dump looks like* — One NZ's words, and `one_update` will write
its own. The old line ran three sentences: "Briefs, emails, legals,
whatever. The promoter's blurb, the venue, the dates if you have them. The
robot mines it for a hook and never echoes it."

Two of the three were the subhead again in a longer coat — *"Drop in
anything you've got."* already grants permission, four words shorter and
higher up the card. Capping the measure fixed the shape without touching
the reason it was long.

Now: **"Give the robot something to write about."**

It sets a bar the old copy didn't. "Whatever" invited volume; this asks for
material that's usable and leaves the judgement with the person dumping —
which is the right ask for the stop that feeds the FEEDER.

*About*, not *with*. "Something to write with" is the fixed idiom for a
pen — and this tool already has a literal pencil in its icon set, on screen
at the same time. "About" has one reading only.

It costs a little breadth: *with* quietly covered the boring half of a dump
— legals, terms, dates — as material, where *about* narrows to subject. The
card can carry that. "DUMP YOUR DOCS" and "Drop in anything you've got."
both say *chuck it all in* before you reach the nudge, which frees this line
to stop repeating them and name the job instead.

It drops "never echoes it", the one reassurance on the card. Deliberate.
That's a promise better answered properly on the data page (hit list 24)
than asserted in passing at stop one.

The 42ch cap stays regardless. `one_update` gets its own hint, and the next
person writing one shouldn't be able to sprawl it across the card again.

## Not done — the clickable ghost

`.fd-stage.todo .fd-head` only sets `cursor:default`. The onclick is live, so
a greyed-out "not yet" stop is fully clickable. Tempting to make them inert
now that shutting everything is possible — but don't. With all three closed
and nothing dumped, stop 1 is itself `todo`; inert heads would mean no way
to open anything. It's a deadlock, not a tidy-up. If the ghost needs solving
it needs a real answer, not a `pointer-events:none`.

## The cache tag

`?v=023` was already on `main` before this sitting, so the current live CSS
is being served under it. Shipping different CSS under the same tag is the
stale-stylesheet trap v022 called out. Bumped to `?v=023a` rather than
burning v024 on a cache bust. Overrule it if you'd rather the tags stayed
plain numbers.

*Honest.*
