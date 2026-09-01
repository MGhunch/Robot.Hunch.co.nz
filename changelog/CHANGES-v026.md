# CHANGES — v026
*1 September 2026 — the three doors finally agree*

*The consistency pass Michael called: SEARCH and DOCS looked right,
WORDS looked like a form. CSS only, plus the cache tag. This zip
supersedes v024 and v025 — none of the three have been uploaded yet,
so upload only this one; all three changelogs ride along.*

## Files

**Replaced**
- `static/index.html` — cache tag only, bumped to `?v=026`. (Carries
  v024's search reworks and v025's source links if you're coming from
  further back.)
- `static/robot.css` — the two duelling `.fd-paste` rules merged into
  one deliberate one, the focus jump killed, the ring rounded. (Plus
  everything v024 and v025 did to this file.)

**New**
- `changelog/CHANGES-v026.md` — this.
- `changelog/CHANGES-v024.md`, `changelog/CHANGES-v025.md` — riding
  along, since neither zip was uploaded.

**Delete by hand**
- Nothing.

## Two rules were fighting over one selector

v023 wrote it down and moved on: "Two rules for one selector, 12px
apart in the file, is worth a tidy at some point." The tidy never
happened, and the second `.fd-paste` block — 11.5px, always-centred,
part of an older layout — was clobbering the designed one, whose own
comment promised a centred placeholder that becomes an ordinary
textarea when you type. The design existed; it just never rendered.

Worse, the designed block had its own bug: `:focus{text-align:left}`
yanked the prompt from centre to left the moment you clicked in. That
was the "left vs centre" — the card changed its mind about its own
alignment on a click that produced nothing.

One rule now, doing what the comment always claimed. Empty, WORDS
mirrors DOCS exactly: scissors, then a centred grey invitation at the
hint's 12px, the same 12px gap, steady whether focused or not. Type or
paste and the placeholder vanishes, the text lands left-aligned at
14px — the search field's reading size — and it's an ordinary textarea
from there. Each door is icon, centred invitation, and the tool only
takes its working shape once you've fed it.

## The ring stopped shouting

The global focus ring is a sharp 2px red rectangle, and around a
96px empty box it read as a validation error — the same complaint
v023 had about the door rings boxing a circle. The textarea has an
8px radius now; the outline follows the corners and reads as a ring,
the way it does on the search field. Keyboard users keep their tell.

`resize:vertical` from the old designed block wasn't resurrected —
the drag handle was clutter the later rule had already dropped, and
the box grows with the paste anyway.

## Verified

Headless Chromium, three states: blurred-empty is scissors over a
centred grey line, indistinguishable in grammar from DOCS; focused-
empty keeps the line centred inside a rounded ring, no jump; typed
text sits left at 14px. The duplicate rule is gone from the file, so
nothing is left to win by accident.

*Honest.*
