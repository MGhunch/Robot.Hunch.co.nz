# CHANGES — v039
*2 September 2026 — the landing pad stops looking broken.*

## Files

**Replaced**
- `static/robot.css` — four rules. Tag `v=039`.
- `static/index.html` — the tag.
- `changelog/CHANGES-v039.md` — this.

## What changed, and why

**The WORDS pad drew a red validation box inside the plate.** The global
`textarea:focus-visible` ring — right for every ordinary field — beat the
pad's own `outline:none` on specificity, so the moment the pad took focus
it wore a 2px red rounded rectangle, inset from the plate, exactly where
an error would sit. A v023 note said the radius made it read as a ring;
it read as a mistake.

**The plate is the landing pad, so the plate wakes.** No ring on the
textarea. On focus the plate's own border goes red — solid, because dashed
is a live drag — and the scissors light up, the same tell the DOCS door
gives a drag. Type, and the scissors go as they always did; the plate
stays awake until you leave.

**The search field wore the same ring over its own red underline.** Same
rule: the ring goes, the plate wakes, the magnifier lights. Two of the
three doors now say "you're in" the same way; the DOCS door already did.

## Verified
- Rendered the pad focused, typed and blurred, before and after.
- `smoke_errors.js`: 22 renders — 20 identical; the two that differ are
  the search door's two shots, showing the plate awake and the ring gone,
  which is the change.
