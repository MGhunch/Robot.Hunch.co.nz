# CHANGES — v035
*2 September 2026 — the brief and the asset become objects. Step 2 of the
front-end refactor. Nothing changes on screen; nothing changes on the wire.*

*Until now FIX IT didn't take a brief. It called `formData()`,
`storyData()` and `val('blurb')` — reaching back into FEED IT's inputs every
time it crafted or tweaked — and `craftKey()` was a JSON dump of the DOM.
FILE IT did the same to both rooms. The handovers were stop numbers. Now
FEED IT hands over a **brief**, FIX IT hands over an **asset**, and FILE IT
takes both. The fields are in FEED IT's own words, Michael's, 2 Sep.*

## Files

**Replaced**
- `static/index.html` — `BRIEF` and `ASSET`; `briefBuild / briefSign /
  briefWire`; the craft keyed on the brief's version; `dirty()` as a
  version check; FIX IT and FILE IT reading only the objects; `fxInit`
  takes the handover.
- `smoke_ui.js` — mirrors the handover (`briefSign()` then `fxInit(d,
  {menu})`) and checks the objects: the brief's three fields and signature,
  the asset's `brief_v` matching, the tweak log growing, a fact change
  making the asset stale.
- `smoke_errors.js` — two lines to make it deterministic: the mouse and
  focus come off the doorway tile before its shot, and THINKING's face is
  frozen on one frame before its.
- `changelog/CHANGES-v035.md` — this.

**Delete by hand**
- Nothing. No Python, no CSS, no new files; the cache tags stay at `v=034`.

## The brief

```
BRIEF = {
  container, v, signed,
  source:  '…',                               // SOURCE  — robot gets everything
  sorted:  { point, insight, angle, steer },  // SORTED  — robot learns priorities
  details: { facts, chosen },                 // DETAILS — robot gets locked detail
}
```

**`v` is a content hash, not a counter.** A hash of source, sorted and
details — so it's a version that can't be wrong: any change in FEED IT
changes it, an edit that's reverted doesn't. `briefBuild()` makes one from
the room's state whenever asked; the room's internals (`formData`,
`storyData`, `CHOSEN`, `CLS`) are how FEED IT *makes* a brief, and nobody
else reads them now.

**WRITE THE WORDS is the signature.** `briefSign()` freezes the brief into
`BRIEF` with `signed:true`, and that's what FIX IT gets. Before that the
brief is a draft.

**What's deliberately not in it.** The bounce transcript — the FEEDER's
working memory, noise; the brief is the decisions, not how they were
reached. The derived terms — engine output, derived from DETAILS on
demand; a brief that carried them would go wrong the day a container's
legals changed. The docs and search hits as separate things — already
folded into SOURCE at the door. The dump is a string.

## The asset

```
ASSET = { brief_v, copy, facts, context, flags, menu, locks, tweaks, pick }
```

Built in `fxInit(d, handover)` from the WRITER's result and the handover
— which carries the engine's terms menu and the terms-failed flag across,
so FIX IT never reads `MENU` or `TERMS_FAILED` off FEED IT. `brief_v` is
the `v` of the brief it was written from. The artefact document and the
threads stay as FIX IT's working state — same argument as the transcript.

FIX IT's older names — `COPY`, `CTX`, `FACTS`, `FXLOCK`, `FXLIST`,
`FXFLAGS`, `PICK`, `TWEAKS` — are views onto the asset until step 3 renames
them: `COPY` *is* `ASSET.copy`, `FXLIST` *is* `ASSET.tweaks`, and the pick
writes through. `fxFinalCopy()` reads the asset. FILE IT's wrap sends
`BRIEF.details.facts`, `BRIEF.details.chosen`, `fxFinalCopy()` and
`ASSET.tweaks.length` — nothing off the DOM.

## The two mechanisms that changed shape and not behaviour

**The background craft.** `armCraft` used to key on a JSON dump of the
form and story; it keys on `briefBuild().v` now. At WRITE THE WORDS, a
craft whose `v` matches the signed brief is used; any other is thrown
away and the craft runs live. Same speed trick, one honest key.

*One deliberate difference, and it's a fix:* the old key ignored the dump,
so a dump edited after the background craft started could ship copy
written from the old dump. The version includes SOURCE, so that craft is
now stale and runs live. That's the drift the tool exists to prevent.

**`dirty()`.** Used to null the copy and drop `REACHED` on every fact
change, by reflex. Now it asks whether the asset was written from a brief
with a different `v` — and if so, does exactly what it always did. The
client sees the same thing; step 4 can save both objects because the
reason is a comparison, not a demolition.

## The gates
- FIX IT (from `THE ASSET` to `toFileIt`) and FILE IT (from `toFileIt` to
  the end) contain none of: `formData( storyData( val('blurb' val('story
  CHOSEN CLS CLR MENU QBRIEF QTURNS FD_DOCS SR_* TERMS_BUSY TERMS_FAILED`.
  Clean.
- The chrome's gate from v034, now with `BRIEF|ASSET` added. Clean.

## Verified — zero visible change
- `smoke_errors.js`: 22 renders on v034, 22 on v035, pixel-identical.
  (One v034 baseline run differed from *another v034 run* on a single
  shot by a sub-pixel of text during a fade — the harness's noise, not the
  code's; two of its shots are now pinned so it can't happen again.)
- `smoke_ui.js` on v035: brief has `container,v,signed,source,sorted,details`,
  `signed:true`, 11 facts, 3 chosen, `sorted` carries the steer; asset
  has all nine keys, `brief_v` matches, menu 16; a drawer pick logs one
  tweak and sets the pick; a fact change nulls the asset, drops `REACHED`
  to 0, and the brief's `v` has moved. The prize_draw run reads the same
  as v034 line for line up to the added checks; it stops at `one_update`
  for the older reason (anonymous word, `testing` container).
- Both scripts and the rooms parse together. No Python touched.

## What's next
Step 3 — five room files. Cut the inline script at the room boundaries
into `door.js feed.js fix.js file.js`; rename what steps 1 and 2 left
wearing old names (`FD_ROBOT`, `.fd-said`, `COPY`→`ASSET.copy` and
friends, the three ticks and two pencils); then `setup.js` against a
clean chrome. The gates above are the cut lines.
