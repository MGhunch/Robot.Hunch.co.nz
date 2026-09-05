# CHANGES — v048 — the ceilings, and the room to play
*5 September 2026. Patched from GitHub main in a web session — if any of
these files carry uncommitted changes in the working tree, stop and
shout before applying.*

## Files
**Replaced**
- `copy_stage.py`
- `static/index.html` (cache tags only)
- `static/js/feed.js`
- `static/js/strings.js`

**New**
- `changelog/CHANGES-v048.md`

Nothing to delete.

## What happened
The 5 Sep run: the FEEDER "fell back to plain: answer empty or
unparseable" twice, the WRITER "returned nothing usable" three times on
one_update, the BUNG beacon fired. Health was green throughout — the
v029 shape, a fallback keeping a secret.

The secret: `max_tokens`. Every call names a ceiling on the answer, and
when the answer hits it the API returns *success* with the JSON stopped
mid-word. The braces never balance, the parse returns None, and the log
says "unparseable" when the truth is "cut off". The WRITER had 2,000
tokens to write all 17 of one_update's modules; the FEEDER had 1,400 for
its react, its ask and the whole `found` pre-fill. Neither fit. The code
never read `stop_reason`, so nothing could say so.

## What changed

**The ceilings, fitted to the jobs:**

| Lane | Was | Now |
|---|---|---|
| WRITER | 2,000 | 10,000 |
| FEEDER | 1,400 | 10,000 — matched to the WRITER, one_update dumps are big |
| FIXER | 700 | 2,000 — fine today; the two-options item would hit 700 |
| READER | 1,500 | 4,000 — a dense picture could silently truncate |
| SEARCH | 1,400 / 400 | unchanged — sized right |

A ceiling is a seatbelt, not a budget — you pay only for tokens actually
written, so a run that fit before costs the same after.

**The cut-off names itself.** `_call` and `_call_blocks` read
`stop_reason` and log `CUT OFF at the N-token ceiling` the moment it
happens. Every parse failure (writer, fixer, feeder) logs the last 200
characters of what actually came back, so "unparseable" can never keep
this secret again.

**Room to play, and a loud door.** The FEEDER only ever read the first
6,000 characters of the dump — a silent trim from the same family.
Now: `DUMP_MAX = 60000` (~20 pages) in `feed.js`, the server reads the
same 60,000, so under the limit nothing is ever trimmed. Over it, DONE
refuses and the robot says — Michael's line, verbatim:

> Wowsers, what are we writing, War and Peace? Try again with less of
> a dump.

The line sticks (it asks for something), the human prunes, DONE goes
again. Refuse loud beats trim quiet. The check measures the whole pad —
paste, docs and found facts together.

## Not touched
- No prompt changes, no CSS.
- `RESEND_API_KEY` is still not on Railway — the beacon logged *nobody
  was emailed* during this outage. Hit list 25 gets more urgent every
  time it fires.

## Check after deploy
The bounce check: rich one-line dump, DONE — the first bubble should
react and confirm, not walk the plain pair. A full one_update run to
FIX IT: the plate fills. Paste something monstrous: the War and Peace
line, and DONE holds. Grep the logs for `CUT OFF` — silence is the pass.

*Honest.*
