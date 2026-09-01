# CHANGES — v029
*2 September 2026 — the robot could not read its own mail*

*The bug behind "the next robot had no knowledge": the FEEDER and
EXTRACT have been silently dead in production since the sonnet-5 bump,
and the fallback hid it. Three small edits to `copy_stage.py`, nothing
else.*

## Files

**Replaced**
- `copy_stage.py` — `_call` reads text blocks properly; the two silent
  fallback paths now log.

**New**
- `changelog/CHANGES-v029.md` — this.

**Delete by hand**
- Nothing.

## The diagnosis, because it was earned

Live probes against robot.hunch.co.nz through an authenticated
session: `/api/health` reported every lane healthy, SEARCH returned
real facts, but `/api/feeder` — handed a dump full of them — returned
`live: false` and the plain line, after 4.7 seconds. Four-point-seven
seconds means the model answered; the server then failed to read the
answer. `/api/extract` had the same disease, which is why the
checklist never pre-filled.

The tell was in the code all along. `_search_call` and `_call_blocks`
both join the response's text blocks, and `_search_call`'s docstring
even says why: a response is "a list of blocks rather than one lump of
text." But `_call` — the helper serving FEEDER, EXTRACT, FIXER and
WRITER — read `resp.content[0].text`, betting the first block is the
text. Since the claude-sonnet-5 / opus-5 bump that bet loses: the read
throws or comes up empty, the `try` swallows it, and the fallback
serves the plain line. Both of Michael's "no knowledge" reports, one
cause. The search facts were in the bag the whole time; the robot
could not open the bag.

## The fix

`_call` now reads the way its three siblings always did:

    "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")

Four response-readers, one pattern. FIXER and WRITER are healthier by
the same stroke.

## The silence gets a voice

The plain-line fallback is right for the person in the chair — a
stumble should read as a plain question, not an error page. But
*invisible* degradation is how two robots stayed dead for days while
looking merely dull. The two fallback paths that said nothing — a
feeder answer that parses to nothing, an extract answer ditto — now
print one line each, so Railway's logs name the problem instead of
keeping the fallback's secret.

## Was the architecture the problem?

No — but it held the door open. The lanes, the prompts-as-files, the
one-failure-surface rule are all sound, and the bug was one drifted
line. The honest lesson is two smaller ones: response-parsing existed
in three places and one drifted (worth consolidating into a single
reader someday), and a fallback that hides failure from the operator
as thoroughly as from the client turns an outage into a mystery.
Logging is the cheap half of the fix; a fallback counter on
`/api/health` would be the thorough half, for another sitting.

*Honest.*
