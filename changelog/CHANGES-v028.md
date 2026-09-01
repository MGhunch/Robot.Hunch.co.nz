# CHANGES — v028
*1 September 2026 — the parrot-ectomy*

*Step one of the FEEDER brief: the voice, without the house. Prompt
only — no code, no config, no shape change. The dynamic rebuild (free
turns, done-listening, harvest, the dig) is step two, a separate
sitting.*

## Files

**Replaced**
- `prompts/feeder.md` — the receipts are gone; the reaction moved in.

**New**
- `changelog/CHANGES-v028.md` — this.

**Delete by hand**
- Nothing.

## The parrot was in the prompt

"CONFIRM — one sentence that confirms what you have, checked back" was
an instruction to issue receipts, and the robot obeyed: three moves,
three inventories of what the human just typed. Sounds like a call
centre. The fix isn't a better model; it's not asking for the receipt.

The first beat of a bubble is now REACT — the robot having a take on
what just landed, half a line, then the ask. It proves it read the
thing by having an opinion about it. The rules that keep it honest,
from Michael's signed-off rewrite, verbatim: earned not issued (a jug
gets no gag), know it or leave it (riff on what you know, react to the
shape of what you don't, never invent a reference), a nod not a quote,
and never read it back — no "so you've got", no "sounds like". If the
robot wants to show it read the dump, the question has to be
impossible to ask without having read it.

## Move 2 found its name

"The benefit" is now **the insight**, because that's the job: finding
the customer insight, the honest reason anyone will bother. "Why will
anyone care?" stays as the usual words, but the prompt now says plainly
that the container may dress it its own way — what's in it for
customers, why will people love it, what's hot about this — with the
old guard intact: don't dress it so far it stops being the question.
The engine vocabulary for the rail is now the point, the insight, the
angle.

## What deliberately didn't change

The contract. Three moves, `{confirm, enrich, angle}`, the same input,
the same fallbacks — `copy_stage.py` parses this prompt's output and
was not touched, so the reaction rides in the `confirm` field (the
prompt says so out loud: the name is historical, the beat is REACT).
The front end renders it without modification — the styled confirm
span just starts carrying half a line of opinion instead of an
inventory.

Known cost, priced in: a rich dump still gets asked what it already
answered, there's no "that's great" done-listening, no harvest, no
confirm turn. All structural, all step two. Step one exists so the
REACT register can be heard in production first — if "Awesome" lands
wrong, we tune words, not architecture.

*Honest.*
