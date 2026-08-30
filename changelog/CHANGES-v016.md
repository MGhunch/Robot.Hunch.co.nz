# CHANGES — v016
*30 August 2026 — FIX IT, nailed*

*One sitting on the copy room, off fix-it-mock.html and
ROBOT-SANDWICH-fix-it-v1.md. The padlock gets a loop, the chat gets a
lozenge, the robot gets a face that thinks, and three pieces of chrome
go. Notes-not-tape is not in here — the tape still travels to the
FIXER as `history`, until the debrief brief exists.*

## The loop
One padlock per section, one loop: open → pencil → shut → pencil → shut.
Tap open or shut and it gets the pencil. Tap the pencil and you've kept
it — the robot says a word and moves you to the next open bit. Leave any
other way (another padlock, a highlight elsewhere, WRAP IT UP) and the
section shuts behind you. Looked at is signed off. LOCK IT is gone
everywhere; so is locking on tweak — a tweak lands, the pencil stays,
you read it, you move on. Terms travel locked and show pink; tap or
highlight and the robot deflects.

Nothing opens on arrival. The whole thing's on the table; the lozenge
says GET STARTED and WRAP IT UP says how many bits there are.

## Focus, three ways
The section in focus lifts off the artefact (scale 1.025, a deep-red
shadow — the room's colour), the pencil shows in the gutter, and the
chat's title reads TWEAKING: HEADLINE. No tint, no tab. Two doors in:
the padlock, or highlighting words — the highlight rides up into the
composer as a red-bar quote and goes to the FIXER as the target span.
It clears with the note that used it.

For the lift, the engine tells the frame's body it's editing and lets
the email's card overflow while it is; the export never sees any of
this.

## The chat
Threaded by section: each section is its own conversation, kept while
you're in the room, re-shown when you come back. The composer is a box,
a ? and an arrow. Dashed box, rule, SEND and the receipt drawer are
gone — the thread is the receipt. Client bubbles are paper, never
black. The ? is for "I'm stuck": one grey line, state-aware, four
seconds.

Robot lines: the opener is "Keep it or tweak it?", once per section.
A typed keep ("yep", "keep it", "fine", "done", "that's the one") is a
state change and never leaves the browser. The kept lines live in the
JS for the same reason — no model call. Every other closer moved out of
the code and into `prompts/fixer.md` as two buckets: did-what-you-said
("Better?") and took-a-punt ("Closer?"). Never "Better?" after a punt.
The why-beat that used to open each section is gone (hit list 15).

## Thinking
The face does it. One behaviour from a pool of four per wait — eyeroll,
roll there-and-back, rock, blink — never the same twice running, and a
1.2-second floor so a fast answer still reads as the robot reading.
The bubble stays empty. Same pool in FEED IT while the FEEDER reads the
dump: one thinking behaviour for the whole tool. The face is inline SVG
for this; the img stays everywhere else.

## WRAP IT UP
One button, full width under the chat, the seventh padlock in it.
Never disabled. 6 BITS TO LOCK → LOCK THE SUBJECT → WRAP IT UP (shut
padlock, ink). Press it early and it doesn't tell, it takes: focus
moves to the first open section and the page scrolls there. GOOD TO GO?
and the disabled Package it up are gone.

## Housekeeping
- **The artefact declares its width.** The frame measures the email's
  own card and sets `--fx-w`; the grid column follows. The engine's
  white card around the email is gone — the email's card is the card,
  on red, with the shadow. Fixes the 40px clip on Prize Draw.
- **Gutter dots reach the card.** Stub is 48px, gap widened.
- **Smoke test** walks the loop: tap, drawer, keep, typed keep, reopen,
  wrap-early. Green on both containers, no page errors.

## Not done, on purpose
- Notes-not-tape (the FIXER debrief at session end). Words first.
- The hero-gutter and doubled-footer questions from the screenshots —
  v015 says the footer's fixed; not seen in this run, will believe it
  when Prize Draw ships a real one.
- The list of robot lines is a placeholder set. Michael's.

*Honest.*
