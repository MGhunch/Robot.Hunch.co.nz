# CHANGES — v013
*30 August 2026 — FEED IT becomes three stops*

*Designed in feed-it-concertina-mock.html (the mock is the spec) and
prompts/feeder.md (the words were signed off before the port). Hit
list 2, 3 and 4 land together: the quiz, the tick list and the
apologetic ask are now one shape.*

## The concertina
FEED IT's right column is three cards on a concertina, one open at a
time. Closed = title + sub. Open = the action. Gutter numbers 1 / 2 / 3
are engine chrome: ring when to-do, white with red number when live,
white with grey number when done. The stepper above stays on 1 FEED IT
the whole way. Anything reached can be reopened.

**#1 DUMP YOUR DOCS — the landing pad.** The pics page's dropzone,
borrowed whole. Browse or drag and drop; text files read in and show as
chips (unreadable ones show struck through with an honest tooltip);
a paste field lives inside the same dashed box. NEXT hands the lot over
as the dump, fires extraction in the background, and opens the chat.

**#2 BOUNCE IDEAS — the chat.** Bare bubbles, no question titles. Three
moves (below). The bouncing dots fire every time the robot reads.

**#3 CHECK YOUR DEETS — the checklist.** The same renderer, inside the
card instead of on its own redpane. Section titles and the date face
drop to Inter — the sections don't perform. WRITE THE WORDS lives at
the bottom of the card; the pics page's back button says THE DEETS and
opens stop 3.

`detailView` is gone. `subView('detail')` now means the concertina
with stop 3 open. The pics page is untouched.

## The FEEDER, reframed
`prompts/feeder.md` rewritten. The robot reads the dump against what
the container needs, then makes three moves. Every move is two beats —
**CONFIRM** (one sentence, what it has) then **ENRICH** (one line that
gets more).

- Move 1, the gap: the one "what's the point" thing that would change
  the email if wrong. Never checklist facts.
- Move 2, the benefit: why will anyone care. Always asked.
- Move 3, the angle: the robot proposes, the human bounces. A yes (or
  nothing) locks it; anything else replaces it word for word.

The rail is fixed, the dressing is live. On any stumble the plain
versions fire — "What's this all about?" / "Why will anyone care?" /
"What's the angle?" — and on move 3 the human just types the angle.
One failure surface.

The FEEDER now also sees what the container sounds like (voice.md,
read-only) so the angle it proposes is one the WRITER can use.

## What lands
One new thing: **the angle**, as a line, in a new hidden slot
(`storyAngle`). It travels to the WRITER in the brief as THE ANGLE —
the one idea the email hangs off. The copy gets a stated angle instead
of inferring one.

## The container
`quiz.json` restructured: `stops` (titles, subs, pad copy), `needs`
(what the email has to do, in words), `moves` (three, each with its
plain fallback, placeholder and why-beat), `closing`, `tools`, `shape`.
The upload tool flag is gone — the pad is the upload. Update Email
will be the same file with different words.

## The API
- `/api/quiz` serves the new shape.
- `/api/feeder` takes `{dump, answers, next}` and returns
  `{confirm, enrich, angle, live}`. Plain fallback on any stumble.
- `/api/copy` reads `story.angle` and writes it into the brief.
- `/api/extract` unchanged; it just fires earlier.

## Files
- `static/index.html` — concertina markup, the FEED IT JS rewritten
  (quizInit, acc, fdDumpNext, fdAsk, fdNext, fdExtract), cache-bust to
  v013.
- `static/robot.css` — one new block, THE CONCERTINA.
- `copy_stage.py` — feeder rewritten; angle in the WRITER brief.
- `prompts/feeder.md` — rewritten.
- `prompts/containers/prize_draw/quiz.json` — restructured.

## Housekeeping
The zip that came in had two changelog folders — capital-C with
v008–010, lowercase with v008–012 plus a full stale copy of the app
nested inside it. This zip ships one lowercase `changelog/` holding
CHANGES-v008 through v013 and nothing else. On the remote, delete
`Changelog/` and the stray app files under `changelog/` by hand —
uploads add but never remove.

*Honest.*
