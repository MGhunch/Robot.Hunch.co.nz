# CHANGES — v025
*1 September 2026 — the receipt becomes a door*

*One tweak, minutes after v024: the source under each found fact is now
a link. This zip supersedes robot-v024.zip — the same two files, one
edit further on — so if v024 hasn't been uploaded yet, upload only this.*

## Files

**Replaced**
- `static/index.html` — the source line renders as a link when the fact
  carries a URL, the hit row becomes a div so the link is legal, and the
  row keeps its keyboard tick. **Cache tag bumped to `?v=025`.**
- `static/robot.css` — the underlined source, its hover, and the hit
  row's focus ring (a div doesn't get the button's for free).

**New**
- `changelog/CHANGES-v025.md` — this.
- `changelog/CHANGES-v024.md` — rides along in case v024 was never
  uploaded; already on your machine if it was.

**Delete by hand**
- Nothing.

## Click the source, read the article

"No source, no fact" has been enforced since v023 — every fact reaches
the screen only if its URL was in the pages the model actually read.
But the URL itself was carried and never shown: the source name sat
under the fact as plain grey text, a receipt you couldn't follow.

Now a linked source is underlined and opens the page in a new tab
(`target="_blank"`, `rel="noopener"`), so checking the robot's homework
is one click and doesn't cost you your place. A fact that arrives
without a URL keeps the plain grey span — no underline, no false
promise. Hover turns it red, like everything else that goes somewhere.

## The row had to stop being a button

The whole hit was a `<button>`, and a link can't legally live inside
one — browsers make no promises about what a click does in there. So
the row is a `<div role="button" tabindex="0">` now, with an explicit
Enter/space handler so keyboard users keep their tick, and its own
focus ring — the global one at `robot.css:8` only dresses real
buttons. `stopPropagation` on the link means following a source never
ticks the row: reading and choosing stay two different acts.

Typography survives the swap unchanged — the global `button` reset was
`font-family:inherit`, which is what a div does anyway.

## Verified

Headless Chromium again: the link opened a fresh tab at the fact's URL
with the tick untouched, the row click still ticked, the no-URL fact
rendered plain, and the underline shows only where there's somewhere
to go.

*Honest.*
