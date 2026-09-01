# CHANGES — v030
*2 September 2026 — the bounce stops being a questionnaire*

*Phase 2 was three fixed questions asked in a fixed order whether or not
the dump already answered them, and it had no way to know what a gap even
was, because no container ever said what its needs were. It's now three
NEEDS that have to be true, landed in as few turns as it honestly takes,
and it ends when you say nothing's missing. EXTRACT is absorbed into the
same read. The shape is written up in the project as
`ROBOT-SANDWICH-bounce-dynamic.md`.*

## Files

**Replaced**
- `prompts/feeder.md` — rewritten around needs and gaps.
- `containers/prize_draw/config.md` — `### The point` added; the Bounce it
  table is now keyed by need, not move number.
- `containers/one_update/config.md` — same.
- `containers.py` — reads the new shape; the exactly-three bounce is gone.
- `app.py` — `/api/quiz` serves `point` + `bounce`; the dead `tools` flag
  and the `move_key` import go.
- `copy_stage.py` — `/api/feeder` rebuilt; `/api/extract` removed; the
  WRITER's brief relabelled and given the canon line.
- `robots.py` — the `extract` lane goes with its endpoint.
- `static/index.html` — the bounce front end; cache tag to `v=030`.
- `static/robot.css` — the angle renders inline in ink, not a red block.
- `test_engine.py`, `test_reader.py` — the exactly-three assertions go.
- `README.md` — route and worker lists.
- `config.md` (repo root) — a note at the top only, no content changed.

**New**
- `changelog/CHANGES-v030.md` — this.

**Delete by hand**
- `_to_delete/` in the repo root. It holds `extract.md` and a stray
  `index.lock`; this shell can't delete files, only move them. Git already
  records `prompts/extract.md` as deleted, so committing is enough — the
  folder is just litter.

## What changed, and why

**Three needs, not three moves.** The point, the insight, the angle. Not
questions to ask — things that have to be true. A need the dump already
answered is landed, not asked. A need that comes back thin gets another go.
`NEEDS_RAIL` in `containers.py` is the rail now, by name; the count isn't.

**The point is confirmed, not asked.** The robot has read the dump, so
opening with "what's this all about?" proves it hadn't. It states what it
reckons the bit that matters is and lets you correct it. Each container
declares what its point is *made of* — the prize, where and when, how many —
so the identifying facts get confirmed first, before anything downstream
hangs off them. That knowledge used to be hard-coded in the FEEDER's prompt,
which meant the prompt had to know about every container that would ever
exist.

**The angle is a proposition, not a line.** It used to come back as copy,
which meant the WRITER spent its craft moment honouring someone else's
phrasing. It now renders inline, in quotes, in ink, at normal weight — the
quotes carry it, and it reads stronger than the bubble around it because
it's ink against grey, not because it's bold. It was a bold red block,
which read as the answer arriving rather than a suggestion you're free to
talk over.

The robot also walks you into it: a `lead` of a few words ("Reckon we lead
with", "I'm thinking", "As an angle"), varied, ahead of the quote. A
proposition dropped in cold reads like a verdict.

**Tone: the robot is on trial, not the human.** "Happy with that?" asks you
to approve the robot's work. "Is that what you had in mind?" asks whether it
got *you* right. Same beat, opposite authority. It's in the prompt as a
principle, not a line, because it governs every place the robot proposes
something.

**It ends on your word.** "That's me. Anything I've missed?" A no closes it.
Anything else is the next move, because you've just said what's missing.
There is a `TURN_LIMIT` of 8 in `copy_stage.py` — a seatbelt, not a rail. It
stops a model that never sets `done` looping on a billable key. If it ever
fires in real use that's a prompt bug, and the log line says so.

**EXTRACT absorbed.** `/api/extract` ran a second, silent read of the same
material, blind and in parallel, and you found out it was wrong at stop 3.
The bounce reads the dump against the container's needs anyway, so it now
returns `found` on the same call. One read, two outputs: the brief and the
pre-fill. The rule is untouched — nothing arrives ticked, provenance shows,
a human decides. The bonus is that the confirm at the point *is* the check
on the extraction, in front of you, at the moment you can see it.

**The honest cost:** this makes the bounce load-bearing. Before, if EXTRACT
fell over the checklist just arrived empty. Now a bounce that fails takes
the pre-fill with it.

**The WRITER gets three things, ranked.** The source material whole, the
brief as a steer, and the checklist facts as canon. The dump used to travel
whole *beside* the checked facts with nothing ranking them, so the WRITER
could lift an unchecked date straight out of the heap — the tick-list rule
only ever governed the facts block. The fix is precedence, not filtering:
filtering can miss something, ranking can't. Nothing was taken away from the
WRITER.

**The chat's magnifying glass is deleted, not wired.** Enriching is thinking,
not fetching — the bounce closes gaps in what it has. Digging is phase 1's
job (the SEARCH door, built) and phase 3's (a row's "let it dig", still to
build). And if the robot could go to the web mid-bounce, the bounce would
stop being a conversation with the human. It had never rendered anyway:
nothing parsed a `tools` key.

## The composer, while we were in there

Michael reported copy "hanging in the input box in a weird way". Three
things, all reproduced in a browser against the running app, all older than
this change:

1. **The last answer stayed in the box after the bounce closed.** `fdNext`
   read the box but only `fdAsk` emptied it, and on the closing turn `fdAsk`
   never runs. Your answer sat there, already sent and already bubbled,
   looking like it hadn't gone. The clear now happens in `fdNext` the moment
   the answer is taken, which is the only honest place for it.
2. **Anything typed while the robot was thinking was silently wiped**, because
   the next `fdAsk` emptied the box on arrival. Nothing clears it but sending
   now, so a draft survives the wait. `FDBUSY` stops a second send instead —
   the keyboard stays open, because being unable to type at the thing you're
   talking to is worse than the bug.
3. **A paste taller than two rows was sliced through the middle of a line.**
   `rows="2"`, `resize:none`, and a hard `min-height:0` inside the stop meant
   131px of text in a 63px box. The composer now grows to fit and scrolls at
   150px, so the chat above never gets squeezed off the card.

## What was checked

- `test_reader.py` on the device: both folders read clean; the broken
  fixture still bounces with five reasons, now including an unknown need.
- `test_engine.py` in the cloud container against the real Flask app:
  engine ok, api ok. The feeder assertions were rewritten and they caught
  the stale contract before I did.
- The bounce driven end to end in a real browser against the running app —
  dump, three turns, close, the brief landing in its slots, the closing
  line, stop 3 opening. No JS errors.
- The angle bubble rendered and looked at: inline, quoted, ink, normal
  weight, with its lead-in.
- The three composer glitches reproduced before the fix and re-run after:
  box empty at the close, a mid-flight draft surviving, and the paste
  measuring 131 against 131 instead of 131 against 63.

**Not checked, and can't be here:** no API key on either machine, so every
live model path — the whole point of this change — is untested until
Michael runs it. The fallback (`live:false`) walks the three needs in order
and closes, which is the old fixed behaviour kept honest.

## The stray config at the root

`config.md` in the repo root is an old copy of the prize-draw config from
before the folder split, and it had drifted well past the bounce table —
different row labels, a `unit` column the live one hasn't got. Checked
rather than assumed this time: every config path in the code is built as
`<container folder>/config.md` and container folders only ever come from
inside `containers/`, so the root is never one. Git agrees the two diverged
— the root copy last touched 31 Aug in a bulk upload, the live one on the
1st.

Left in place on purpose. Only a note added at the top saying the engine
doesn't read it and where the live one is, so the next session doesn't edit
the wrong file. What it's *for* is Michael's call, not the code's.

## Still open

- SET UP has to learn to emit the new config shape. Containers are built in
  their own project, so that's a note across, not a job here.
- Phase 3's "let it dig" — the row-level dig — is still the apologetic stub.
  That's the next sitting.
