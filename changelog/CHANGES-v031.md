# CHANGES — v031
*2 September 2026 — CHECK YOUR DEETS becomes LOCK THE DEETS*

*The old stop made everything look like a task: dashed red pills
everywhere, three unset dates reading as three emergencies, tick circles
confirming things that didn't need confirming. Only two things are active
now — red TBCs to fill, specific terms to tick. Everything else is
furniture. Built to `deets-mock.html`; the mock was the spec.*

*The deeper shift: the details are canon — they beat the dump downstream —
so the stop borrows FIX IT's padlock rather than the tick. A tick says
checked; a lock says settled, don't move. The client learns the device
here, on easy facts, and arrives in FIX IT already fluent. The tick
survives where it belongs: the specific-terms chips. Two devices, two
weights.*

## Files

**Replaced**
- `static/index.html` — the stop-3 renderer rebuilt as sections with
  padlocks; the door moves outside the cards; cache tag to `v=031`.
- `static/robot.css` — the section, padlock, dates-list and door styles;
  the tick circle, the paired cards and the provenance line deleted.
- `app.py` — the stop renamed; `prize_line` no longer served as a
  standard-terms pill; the optional-clause heading is *Specific terms*.
- `containers.py` — parses `sentence:` in a prize-type block.
- `engine.py` — `type_options` carries `sentence`, `counts` and
  `counts_one` to the card.
- `containers/prize_draw/config.md` — a `tickets` row with a derive rule;
  `counts:`, `counts_one:` and `sentence:` for movie, gig and sport; the
  `privacy` clause added to the base, pulled from the brand library.

**New**
- `changelog/CHANGES-v031.md` — this.

**Delete by hand**
- Nothing new. `_to_delete/` from v030 is still there.

## What changed, and why

**The prize already had a definition, and nobody ever saw it.** `prize_line`
is a fixed clause — *One (1) double pass to {prize_name} at {venue} on
{event_date_long}* — and it publishes in every set of terms. But it hangs
as a sub-bullet, and the card built its standard-terms pills from
`MENU.filter(c => c.fixed && !c.sub)`, so the one clause that says what
somebody wins was the one clause filtered off the screen. THE PRIZE at the
top of this stop is that definition in its other dress: same facts, fewer
formalities, so the two can differ in tone and never in substance. The
words live in the container as `sentence:` per prize type, never in code.

**`tickets`.** The human dress can say *Gold Circle double passes* and the
legal line can't, because no fact held the words for the thing itself. It's
a fact now — one row, not stuffed into `prize_name`, which the prize clause
prints verbatim. It carries the whole phrase: *double passes*, *free
passes*, *Gold Circle tickets*. Tier was too narrow a name for it, and it
was doing the same job as the type's `counts:` anyway.

It fills itself with a second derive rule, `typeCounts`, named in the
container the same way the draw date names its own: the type supplies
`counts:` and `counts_one:`, and the row takes whichever the winner count
calls for. It's a **default, not a live derivation** — it only ever
overwrites its own last suggestion, so words that came off the dump, or the
human's own, stand. Change the winner count while it's still the robot's
phrasing and it flips singular to plural; change it after an edit and the
client's words are left alone.

**Locks, not ticks.** `DZ` holds one state per section — open, edit,
locked. `ticked` on a row now means *locked*, and nothing else sets it.
WRITE THE WORDS wakes when all three are shut, exactly as GOOD TO GO does.

**The padlock is one constant now.** `PADLOCK` holds the three icons, the
four tooltips, the face each state wears, and — the bit that was actually
duplicated — the journey itself: *tap open or shut for the pencil, tap the
pencil to keep it; `fixed` isn't a step, it deflects.* Both rooms hand it
their own three verbs and it decides what a tap means, so FIX IT's gutter
and this stop's sections can't drift apart. `FXI` survives as an alias for
the icon set, so nothing in FIX IT had to be renamed.

**The open shackle stands clear of the body.** It used to sit down on the
lock with one leg missing, which read as very nearly shut — the one state
that most needs to be unmistakable. It now springs up and away. Six
variants rendered side by side on the red before picking. This lands in
FIX IT too, which is the point of having one constant.

**Canon can't ship with a hole in it.** A section with an unfilled row
refuses to lock: the TBC flashes and the robot names the missing fact.

**An unlocked row is genuinely optional.** `cellFilled()` replaces the old
"has a value" test, and a row the container marked `locked: no` passes it
empty. Without that, a blank tier would have held the whole stop hostage —
and stopped the terms loading, since `refreshLegals` used the same test.

**The writer starts earlier.** `armCraft` fired on `detailReady()`, which
now means *locked*, so the Opus wait would have landed entirely at the
door. It fires on `factsComplete()` instead — every fact in, padlocks or
not — so the craft usually finishes while the client is still reading the
legals.

**Privacy joins the standard terms.** `prize_draw` never published the
privacy clause; `one_update` always has. It's the brand library's own
approved wording, pulled with `@brand`, so no new legal text was written —
but it does change what a prize draw ships, so **Suze should see it before
this goes near a client.**

The block's closing line is *These are always included* — they aren't
riding along beside the terms, they are the terms — and the peek names
what it opens: *Read terms*.

**Also gone:** the provenance line (*the robot found this*) everywhere in
this stop; the robot found everything, so it was noise. The standard-terms
chip row is one grey block naming the clauses, with *Read them* opening the
words as they'll print.

## One for the next session

**Editing the parser does not invalidate the container cache.** `_compile()`
stamps `<container>.compiled.json` with the folder's mtime, so a change to
`containers.py` alone leaves a stale cache in place and the new field reads
back empty. Cost twenty minutes today. `touch containers/<id>/config.md`
after any parser change.

## Checked by rendering

The ticket words checked four ways: a human phrase survives a redraw, a
blank row seeds off the type, one winner reads *One double pass*, and an
unknown type drops the section back to the fact grid with `prize_type` as
its hole. Statics driven headless and screenshotted at six states: all open, dates in
edit with native pickers, a refused lock, the prize open showing the facts
underneath, the terms panel peeked, and all three locked with the door
live. `one_update` rendered too — its repeating stories are a locked
section like any other, so no container ends up with locks and tick circles
on the same screen. No JS errors; `containers.py` validates both.

*Honest.*
