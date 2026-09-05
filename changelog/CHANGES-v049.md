# CHANGES — v049
*5 September 2026 — IT CHANGES, THEN YOU CONFIRM. The container chat had the
loop the wrong way round.*

## Files

**Replaced**
- `app.py` — `_preview()`, and the chat route returns one with every proposal.
- `static/js/setup.js` — the preview swap and the restore. Tag `v=049`.
- `static/js/strings.js` — KEEP IT / PUT IT BACK, and the line that says a
  proposal was put back. Tag `v=049`.
- `static/robot.css` — the live card's red edge. **`robot.css?v=049`**.
- `smoke_setup_room.js` — the check that was missing.

**New**
- `changelog/CHANGES-v049.md` — this.

**Delete by hand** — nothing.

## What was wrong

v047 built confirm-then-change: the robot proposed, you read a diff, you
pressed the button, and only then did the artefact move. Michael's sentence,
which the whole room was built from, is the other way round:

> "it should show a thing and I should be able to say 'Not that font in the
> headline, this one' **and it changes and I confirm** and then commit to
> send it live."

So the picture sat there looking dead while you talked at it, and the room
read as broken when every part of it was working.

**And a real bug behind it.** Typing again cleared the pending proposal
without a word — `setupAsk` did `SETUP_PROP=null` on the way in. You could
hold a whole conversation, get good proposals every time, and land none of
them. That is what happened on the first real run: two proposals, both
binned by carrying on.

## What it does now

    you say it -> the artefact changes -> KEEP IT / PUT IT BACK

**The preview is the real edit, made on a copy.** `_preview()` copies the
folder to a scratch dir, runs the proposal through `setup_chat.apply` — the
same lane that would make it for real — and re-reads the result. So what you
are looking at is the change, not a second implementation of it that can
drift from the first, and not a guess rendered in the browser.

**Nothing is on disk.** No draft is made, no changelog line is written, no
version is bumped. A folder that says it was edited when it wasn't is worse
than no preview at all. The state pill stays LIVE until you keep it.

**PUT IT BACK is a restore**, not another round trip — what you were looking
at a second ago never left the page.

**Carrying on puts it back and says so.** *"Put the last one back — you
carried on."* A change that disappears without a word is the worst thing this
room could do.

**The strays line re-reads too.** Swap the undeclared Bebas for a face the
brand owns and the preview's "wearing a face the brand doesn't declare" line
clears while you are looking at it.

## The buttons

When you can SEE the change: **KEEP IT** / **PUT IT BACK** — you've already
looked, so the question is whether you're keeping it. The card wears a red
edge to say the artefact is showing something that isn't on disk.

When you can't — a length in `spec.md` changes nothing visible, or the edit
wouldn't render — it falls back to the diff and **THAT'S IT** / **NOT THAT**.
Same proposal, honest label.

## Also

The teaching lines under the artefact are gone, on all three container stops.
A caption explaining the picture is something to read instead of looking at
the picture, which is the one thing this room is for. The brand rails lost
theirs in v046 for the same reason.

## Checks

    smoke_gates.sh        PASS
    smoke_ui.js           PASS — errors: []
    smoke_setup_room.js   PASS — now covers the preview loop and the bin
    test_setup_chat.py    PASS
    test_reader.py        PASS
    test_engine.py        FAILS — "Tickets is blank", as on main

**The check v047 was missing.** It proved the FILE changed and never once
proved the PICTURE did — which is exactly the gap the bug lived in.
`smoke_setup_room.js` now watches the artefact through propose, put back,
and get superseded.

*Honest.*
