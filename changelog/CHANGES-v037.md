# CHANGES — v037
*2 September 2026 — the renames. Step 3 of the front-end refactor, second
half, and the last of the tidying. One pixel moves, and it moves on purpose.*

*Steps 1 and 2 moved code without touching a name, so every diff stayed
reviewable. The names they left behind — FEED IT's prefix on the chrome's
line, FIX IT's old globals as views onto the asset, three ticks where one
would do, a pencil nobody used — get fixed here, in one sitting, with the
harness watching. After this the front end has the back end's shape and
nothing in it is misnamed.*

## Files

**Replaced**
- `static/js/chrome.js` — `TICK` replaces `CL_CHECK`, `FI_TICK` and the
  dump row's inline tick; `CL_PENCIL` deleted (declared, never used — the
  padlock's pencil is the pencil); `FD_ROBOT` becomes `RAIL.cave`; the line's
  class is `.line`. Cache tag to `v=037`.
- `static/robot.css` — `.fd-said` → `.line`, `fd-said-in` → `line-in`; the
  chip's tick stops overriding the stroke and takes its colour from the
  chip. **First CSS change since v033: tag to `v=037`.**
- `static/js/fix.js` — `COPY CTX FACTS FXLOCK FXLIST FXFLAGS PICK TWEAKS
  LOCKED` are gone; every read is `ASSET.copy`, `ASSET.context`,
  `ASSET.locks`, `ASSET.tweaks`, `ASSET.flags`, `ASSET.pick`. `ctx(k)`
  reads a slot off the asset for `fillPh`.
- `static/js/feed.js` — the chips and the dump row draw `TICK`; `fdBubble`
  uses `RAIL.cave()`; `refreshLegals` no longer writes a `FACTS` nobody read.
- `static/js/sandwich.js` — `enterRoom` resets what exists: `MENU`,
  `CHOSEN`, `BRIEF`, `ASSET`, the craft, `FXDOC`. `EXTRACTED` and
  `EXTRACTING` — assigned every entry, read nowhere since v028 — are gone.
- `static/js/file.js` — draws `TICK`.
- `static/index.html` — cache tags: every room and the chrome to `v=037`.
- `smoke_ui.js` — follows the renames (`ASSET.locks`, no `FACTS`).
- `changelog/CHANGES-v037.md` — this.

**Delete by hand**
- Nothing. `strings.js` untouched (`v=034`). No Python.

## The one visible change

The specific-terms chips in LOCK THE DEETS drew their own tick — a 24-box
glyph at stroke 3 — while the dump row and the FILE IT tiles drew a 16-box
glyph at stroke 2.2, near-identical to each other. Now all three draw the
chrome's `TICK`. The chip's tick is a hair lighter than it was. That's the
whole diff, and Michael saw the crop before it shipped.

While making it, the chip's CSS turned out to set `stroke:#fff` on the
`<svg>` — which the old glyph obeyed because it carried no stroke of its
own, and which the chrome's glyph ignores because it does. The first render
came out grey. Fixed by giving the chip `color:#fff` and letting the glyph
carry its own stroke, as every other tick already does. The harness earned
its keep again.

## Verified
- `smoke_errors.js`: 22 renders on v036 as committed (byte-checked), 22 on
  v037, pixel-identical — twice. The chip tick isn't in those 22 views, so
  it was rendered separately on both versions at 3×; the crop is the
  visible change above and nothing else moved.
- `smoke_ui.js`: output identical to v035 and v036, line for line, to where
  it stops.
- `smoke_gates.sh`: every file clean.
- Every file parses; no page errors.

## The refactor, closed
- v034 — the chrome out of `index.html`.
- v035 — the brief and the asset as objects.
- v036 — five room files and the sandwich.
- v037 — the names.

Every step pixel-identical to the last (this one bar a tick), every step
its own commit, every gate a script in the repo. `index.html` is 355 lines
of markup. What's left is not tidying: the run store (step 4, a feature)
and SET UP (a new room on a clean chrome, with its own brief).
