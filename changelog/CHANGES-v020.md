# CHANGES — v020
*31 August 2026 — one chat family*

## Files
REPLACED `static/robot.css` · `static/index.html` · `smoke_ui.js`
NEW `changelog/CHANGES-v020.md`
DELETE by hand: nothing.

*Off chat-mock.html — the mock is the spec. A styling pass, no
behaviour change; nothing the engine or the containers read moved.*

## The problem
FEED IT's chat and FIX IT's rail were two copies of the same idea
(`fd-*` and `fx-*`) and they'd drifted: the robot's disc was 36px with
a shadow in one room and 27px flat in the other; the rail's bubble was
a point smaller; the rail's me-bubble wore two hard-coded hexes nobody
had named. One robot, two faces.

## The fix
One family, `.chat`, used by both rooms:

- **`.chat` / `.chat-row` / `.chat-row.me` / `.chat-cav` / `.chat-msg`**
  — FEED IT's values are the base. Paper robot bubble, white bordered
  me-bubble, 14/4 radius, 13.5px type, 36px disc with the shadow.
- **`.chat.narrow`** — the rail's only modifier, and it's only allowed
  to touch padding and margin. If it ever changes type or the disc,
  the family's broken again.
- **Inside a bubble** — `.small`, `.quote` (was `fx-hlq`), `.confirm`
  and `.angle` (were `fd-confirm`/`fd-angle`) ride the same in both
  rooms. `.chat-opt` is the fixer's pressable bubble (was `fx-opt`).
- **`.chat-think`** is the thinking row in both rooms; the face sizes
  from `.chat-cav`, so FIX IT's think-face grows to match FEED IT's.
- **Ghost avatars** (`.chat-cav.ghost`) now exist in FEED IT too, for
  when it wants follow-on bubbles without a second face.
- **`.botdisc`** moved up to sit with the family. Base 27px stays for
  the FINISHED sign-off and anywhere else the face appears small.

## Binned
The `fd-chat` scroll mask and `max-height`, the `.fd-msg .fd-q` rule
and `.fx-cav img` — all dead, overridden or unreachable since the
concertina landed. About forty lines out net.

## Not touched
The two composers (FEED IT's dashed box and NEXT; the rail's rule, ?
and arrow) — different jobs, kept separate on purpose. `.fi-say
.botdisc` on FINISHED sets the 36px disc a third time; left alone this
cut, one line if we want it.

*Honest.*
