# CHANGES — v015
*30 August 2026 — the first real run, and what it taught*

*One Update went through end to end and the WRITER came back in shape.
This is the tidy-up from watching it: the journey loses a page and a
box, the checklist becomes the container's business, the FEEDER learns
to listen, and four bugs go.*

## The lineup — One Update's checklist is one card
NEEDS in `containers/one_update/config.md` is now THE LINEUP: a row per
story (type, what it's about) with the legal topics hanging off it as
square chips. Issue, thread, card count, prize rows, links: gone. Facts
are factual and live in the dump; the WRITER reads them straight. A
prize story carries the draw clause by default; the human unticks.
Prize Draw keeps its full checklist because its terms assemble from it.
Same engine, two personalities, no code per container.

Engine side: a `topics` row type (`topics from LEGALS below`), a list in
the facts, spoken as labels in the brief. Repeat headings can read `THE
LINEUP (repeats per story, 3–5)` as well as `EACH CARD (…)`. The
checklist hands the front end `topics` (the extras plus the per-story
clause, `when: prize`). The lineup draws as compact rows, no title, no
provenance line; the legals card at the bottom goes when a container
carries topics.

## The journey
- **Pics page gone.** WRITE THE WORDS goes straight to FIX IT. Images
  arrive from FIX IT when 2.0 wants them. Hit list 6 moves there.
- **One shape.** The bounce box wears the pad's dashed box: white, a
  cursor in it, NEXT underneath. No placeholder, no prompt. Enter sends;
  Shift+Enter is a newline.
- **The ghost starts at the header.** Subject bars, preheader and
  read-online were noise up there.
- **Thinking dots** never double up and always clear before a bubble.
- **Tabs over THE WORK** come from the spec's outputs. WEBTILE is gone
  until a container has one.
- **THE WORKINGS wears the chat card.** FIX IT's conversation in FEED
  IT's clothes: white card, grey robot bubbles, outlined human bubbles,
  the dashed box, SEND. One chat, one look.

## The FEEDER, tuned
`prompts/feeder.md` rewritten around one habit: **say only what's new,
ask only what's open, propose one idea.** CONFIRM says what changed
since last time or nothing, never the brief again. Move 1 doesn't invent
a gap when the dump answers the point. Move 2's default is the plain
"Why will anyone care?"; it's dressed only when the robot can name what
it's unsure about, and never as a menu. Move 3 has no confirm and
proposes an idea, not an inventory. No em dashes. The rail carries every
fact forward whether it's said aloud or not.

## Bugs from the run
- **`closes_long` bare in a card.** The brief handed the WRITER card
  facts by id. Now it speaks in row labels and human values, always.
- **Sign-off doubled.** Spec said "incl. Ngā mihi lines", rules said
  they're fixed. Spec now says the html owns them. The validator can't
  see this kind of contradiction; testing is what caught it, as §7 says.
- **Cinema clauses leaked into One Update.** CHOSEN and MENU carried
  over from the last room. Walking into a room resets every run state.
- **Privacy and copyright twice.** The engine poured terms into a
  `legals` module the html already had a `base` for. It only pours where
  the html has `data-module="terms"`; One Update's legals are parked and
  untouched.

## Files
`config.md` and `spec.md` (one_update), `containers.py`, `engine.py`,
`copy_stage.py`, `app.py`, `prompts/feeder.md`, `static/index.html`,
`static/robot.css`, the tests.

*Honest.*
