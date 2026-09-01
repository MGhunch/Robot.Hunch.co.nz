# CHANGES — v023
*1 September 2026 — the landing zone stops wobbling, the concertina shuts,
and the third door opens*

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
  *(Committed in the first pass; not in the later zips.)*
- `copy_stage.py` — `/api/search`, two stages, and the three promises kept
  in code rather than only in the prompt.

**New**
- `prompts/search.md` — the SEARCH tool. A tool, not a worker.

**Not in the zip**
- `search-mock.html` — the SEARCH design, six states. A mock, like
  `dump-mock.html` before it. Lives outside the repo until it's built.

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

## The second sitting — the card as seen

The first pass fixed the measure. Looking at it live turned up six more.

**The nudge is gone.** Not emptied — `containers.py` requires the *What a good
dump looks like* section and files a problem if it's blank, so the container
would bounce itself. Instead nothing feeds `fdPadHint` any more. The div and
its CSS stay, `.dump-nudge:empty{display:none}` hides it, and one line brings
it back. Worth knowing: `feed_it.dump` now renders nowhere. It's a required
field read by nothing — either wire it into the FEEDER or stop requiring it,
but don't leave it drifting.

**Discs to 56px**, glyphs to 25px. They're the door furniture; they were
smaller than the words under them.

**The red rectangle was our own focus ring.** `robot.css:8` puts
`outline:2px solid var(--red)` on every focusable thing — fine on an input,
but round a door it boxes disc and label together, a hard rectangle around a
circle. Moved onto `.dump-disc`, where the outline follows the border-radius
and reads as a ring. Keyboard focus still shows; it just stopped looking like
a validation error.

**WORDS lost its rule.** A second `.fd-paste` block further down the file was
overriding the first with `border-top:1px dashed` and `margin-top:18px` — the
line across the box, and the gap that stranded the scissors above it. Both
gone. Two rules for one selector, 12px apart in the file, is worth a tidy at
some point.

**DOCS was never centred.** `.dump-empty` was a plain block, so the upload
icon sat inline at the left edge while `.dump-hint` centred its own text. It
only looked centred because the block shrank to fit. Now a centred flex column
with the same 12px gap as WORDS, so both doors stack icon-over-line the same
way.

**The deets read TBC.** `clRowEl` fell back to the row's own question and only
used TBC if the question was missing. A grid of full questions — *"Is it movie
passes, gig tickets, sports tickets, or something else?"* — wraps to four
lines and turns the card into noise. Now every unknown is TBC. The question
isn't lost: it's still the placeholder in the edit field, which is where
someone actually needs it.

*Not touched:* the story card at `clRepeatCards` has its own unknown state,
still showing `subjRow.ask`. Different card, so it's left alone pending a word.

## SEARCH — designed, not built

`search-mock.html`, six states, off site plan §6. The ask, the confirm, the
looking, the catch, the landing, and the empty catch.

Three things the mock decides that the plan doesn't. The confirm gets its own
screen, which is what turns four searches into a visible budget rather than an
invisible limit. The tick leads on the left, against the plate's convention,
because choosing is not the same job as reporting. And a refused fact is shown
struck through with its reason, because silently dropping the price reads as a
worse search rather than a deliberate line.

## SEARCH — built

Hit list 9. `/api/search` didn't exist, `prompts/search.md` didn't exist,
and nothing in `app.py` mentioned searching — this was greenfield, not
half-wired.

**Claude's own web search tool**, so no second vendor and no extra key.
`anthropic` was already a dependency. Three things that changes:

- **The four-search cap is real.** `max_uses` is an API parameter, so the
  budget is enforced by the tool rather than requested in a prompt. Ask for
  more and the call errors.
- **Citations come back automatically**, each with a URL. So *no source, no
  fact* stopped being a hope. `_cited_urls()` collects every page the model
  actually read in that call, and any returned claim whose URL isn't in that
  set gets dropped and logged. A thing it "knows" but didn't read never
  reaches the screen.
- **The price bar is a regex, not a request.** `_MONEY` catches currency,
  amounts and the words around them. A fact that trips it is moved to
  `barred` rather than binned, so the screen can show it struck through with
  its reason — found, named, not carried.

Two stages, because the plan says the human confirms first. `stage:"plan"`
returns up to four searches and spends nothing. `stage:"run"` takes the
approved list and runs it. Sonnet via `ROBOT_MODEL_SEARCH`, per site plan §6
— worth noting `_call` still sends everything else to one model, so the
plan's Sonnet/Opus split remains half-done elsewhere.

**A model id I got wrong, and the lesson in it.** `ROBOT_MODEL_SEARCH` first
shipped defaulting to `claude-sonnet-4-8` — pattern-matched off the
`ROBOT_MODEL` default sitting above it rather than checked. No such model,
so every call 404'd and surfaced as the robot saying it couldn't go looking.
Now `claude-sonnet-5`, and a model error says so instead of hiding behind
the robot's manners.

Worth noting `ROBOT_MODEL` defaults to `claude-opus-4-8`, which is also not
a current id. It has never bitten because Railway sets the variable — but it
is a live trap for anyone running this without one, and the reason I copied
a bad pattern in the first place. Both defaults should be real.

**Cost.** Searches are $10 per 1,000, so four is four cents. Tokens for
reading the results are the bigger half and won't be known until it's run
a few times. Comfortably inside the plan's under-50c-a-run, but not free.

### The front end

`ask -> plan -> looking -> hits`, one view with four faces. The arrow
proposes and the button commits, which is two weights for two sizes of
decision — and the arrow is FIX IT's, whose own comment already settled
that a field gets an arrow and not a SEND button.

DONE stayed in the footer and SEARCH went into `.fd-tools`, the empty slot
that was already sitting there in stop one's markup. Left is the door's
action, right is the stop's exit. One new button state — `.ghost`, hollow
with ink — so SEARCH can stay reachable after results land without shouting
as loudly as DONE. The states work out so two solid red pills never appear
together.

Ticked facts join `fdDumpText()` carrying their source, so the FEEDER and
the WRITER never see a bare claim.

### Three bugs the screenshots caught

Rendered every state in headless Chromium and looked at them, which was
worth doing:

- The magnifier was an `<svg>` nested inside an `<svg>` — legal, invisible.
- The search view was getting `filled` unconditionally, and the pre-existing
  `.dump-view.filled .dump-baby{display:none}` was eating the icon. It now
  only lands once the ask screen is behind us, which is what `filled` means
  anyway.
- `.sr-fact` and `.sr-src` were inline, so every source ran on from the end
  of its fact — *"…14 March.Spark Arena"*.

None of the three would have shown up in a syntax check.

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
