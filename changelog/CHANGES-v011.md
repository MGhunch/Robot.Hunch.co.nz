# CHANGES — v011
*28 August 2026 — the big one: the pics page, the checklist, the
conversation*

*Three approved designs land in one release. Each was mocked and
signed off before the port: uploads-mock-v4, checklist-mock (the
mock is the spec — HANDOVER-2808-Checklist), fixit-conversation-mock-v2.*

---

## 1. THE PICS PAGE *(FEED IT page three)*

WRITE THE WORDS no longer jumps to the copy room — it lands on
WORKING ON THE WORDS. GOT ANY PICTURES?, same redpane as the story,
stepper untouched. The robot is already writing by this point, so
the page exists to fill that window. One white card, one dropzone,
POP YOUR PICS IN HERE, Browse files linked, thumbnails in the card.

One exit, two labels. Empty: NO IMAGES? NO WORRIES. Pics in: LET'S
GO BUILD. Both doors open FIX IT; images are optional by design. If
the robot's genuinely still writing, the existing robot-is-writing
moment shows. Status as an event, not a meter — the pulse device
was mocked and cut for confusing the action.

New store: POST /api/images and DELETE /api/images/<run>/<name>,
auth-gated, no model. JPG or PNG, 10MB cap, names cleaned to one
rule, filed under ROBOT_IMAGES/<run>/. **Deploy step: set
`ROBOT_IMAGES=/data/images` so pics live on the volume with the
log.** They wait for FINISHED (hit list 5) and the respec (6).

## 2. THE CHECKLIST *(hit list 3 closes; front half of 4 arrives)*

THE DETAIL becomes THE CHECKLIST — "Got all the facts in a straight
line?" Chrome/config split from day one: CL_CONFIG is the container
speaking, the chrome renders whatever it's handed and knows nothing
about prizes. A down payment on 17; it's the needs list wearing a
UI (20).

The rules, from the spec: the tick circle is the control; the fact
is the edit button; **an edited fact is an unconfirmed fact**; **a
robot-found fact never arrives ticked** (provenance line, grey
tick); **nothing flies without a tick** — every visible row ticked
is now what arms the background crafting and lights the door.
WRITE THE WORDS is the door (GOOD TO GO stays FIX IT's — ruled).
Legals are selection, not confirmation: square clause cards off the
live menu, red border on.

NOT SURE lives inside edit on configured rows. Two doors: I'LL TELL
IT / LET IT DIG. Dig answers honestly until SEARCH exists: "Can't
dig yet — that bit of me is still being built. Tell me for now?"

WINNERS DRAWN is human-editable and human-ticked (ruled: derive-only
was an error). terms.py accepts the override — must land on or after
the close, derives next-working-day when absent. Deterministic half,
one guard, tested.

## 3. THE CONVERSATION *(the FIX IT pass)*

The rail is a chat now. Topic pill carries the what; the robot's
bubbles carry the why; the input bar is the pencil. TWEAK IT /
LOCK IT die. The edit modal dies. The DON'T TOUCH modal dies —
locked facts answer in chat voice instead.

The FIXER's first job is reading the reply: a confirmation locks —
"Subject line locked — happy with the headline?" — announced, one
breath, tour moves on. A note gets the smallest change, marked on
the artefact in pen. Unclear asks straight. The contract gains an
action field (lock / change / ask / decline), back-compatible, and
the log records the action — a yes is a judgement worth keeping.

The furniture goes quiet: gutter padlocks flip in the background,
still tappable for direct movers, and the bar now spins around its
hinge to hang as a hook when open. Tab joins the artefact card
properly; dead tab contrast up; rail fixed at 360; highlighter pen
(#FAF06E) replaces the mustard token everywhere it was worn.

Held loosely for overrule: the rotating closers, "Say what you'd
change…", the bridge lines, the all-locked close, the can't-dig line.

## Tests

The standing pass: page strings, dead things confirmed gone, the
drawn-date guard both ways, the action contract end-to-end with a
canned model (lock / change / both back-compat shapes / log), the
images round trip, node on the script block. All green.

*Honest.*
