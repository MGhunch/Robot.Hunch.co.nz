# CHANGES — v032
*2 September 2026 — the SET UP renames. Five names, nothing else moves.*

*A file that travels alone should say what it is; a file that never leaves
its folder should have a fixed, boring name. The brand files go out in
public — emailed, pasted into Prompter, opened in a lonely tab — so they
carry the surname. Config and spec never leave, so they keep their plain
names. And the artefact was repeating the folder's name in its own, which
bought nothing. Settled in the SET UPs chat, 2 Sep; this is the engine
catching up. Same files, same sections, same tables, same grammar.*

## Files

**Renamed** *(GitHub Desktop shows these as renames; drag-and-drop would
need the old names deleted by hand)*
- `brands/one_nz/voice.md` → `brands/one_nz/brandvoice.md`
- `brands/one_nz/skin.md` → `brands/one_nz/brandlook.md`
- `brands/one_nz/legals.md` → `brands/one_nz/brandlegals.md`
- `brands/neon/voice.md` → `brands/neon/brandvoice.md`
- `brands/neon/skin.md` → `brands/neon/brandlook.md`
- `containers/prize_draw/prize_draw.html` → `containers/prize_draw/container.html`
- `containers/one_update/one_update.html` → `containers/one_update/container.html`

**Replaced**
- `containers.py` — opens the new names; its problem strings say them;
  `_parse_spec` keys off `## VOICE SPECIFICS`; the artefact path is
  `container.html`, not `cid + ".html"`.
- `test_reader.py` — the broken fixture no longer renames the html; with a
  fixed filename there's nothing to rename.
- `file_it.py` — a docstring.
- `containers/prize_draw/spec.md`, `containers/one_update/spec.md` —
  `## VOICE LEAN` → `## VOICE SPECIFICS`, with the guardrail moved into
  the italic line under it.
- `brands/one_nz/brandvoice.md`, `brands/neon/brandvoice.md` — the
  opening italic names VOICE SPECIFICS.
- `containers/one_update/config.md` — the brand-library pointer.
- `containers/prize_draw/container.html`, `containers/one_update/container.html`
  — comments only.
- `brands/one_nz/assets/README.md`, `README.md` — prose.
- `static/index.html` — one JS comment. No CSS touched; cache tag stays
  at `v=031`.

**Delete by hand**
- Nothing, if you commit from GitHub Desktop. The `_to_delete/` from v030
  is still there.

**Not touched, on purpose**
- The dated changelog lines inside `brand.md` and both `config.md`s still
  say `voice.md`, `skin.md`, `VOICE LEAN`. They're history; rewriting
  history to match a later rename is how the paper stops being trustworthy.
- The `.compiled.json` caches rebuilt themselves on the next read.

## What changed, and why

**The reader.** `_parse_brand` wanted `brand.md`, `voice.md`, `skin.md` and
looked for `legals.md`; now `brandvoice.md`, `brandlook.md`, `brandlegals.md`.
`_parse_container` built the artefact path from the folder id; now it's
`container.html` for every container, so a folder is always the same
three filenames. Every problem string that named a file names the new one,
so a bounce reads true.

**The heading.** `VOICE LEAN` was doing two jobs — naming the section and
warning what not to put in it. The name goes plain (*specifics* collides
with nothing; *tweaks* is FIX IT's verb, *lean* was a private joke) and
the warning goes where warnings live, in the italic under the heading:
*Appended to the brand voice on every WRITER and FIXER call. Where this
format adjusts it, and no more. Brand stays in the brand folder.* The dict
key `spec.lean` is unchanged — nothing downstream reads the heading.

**The test.** The broken fixture used to rename `prize_draw.html` to
`broken.html` so the copied folder wouldn't bounce for the wrong reason.
With a fixed filename that line has no job, so it's gone. Still five
reasons, still the same five.

## Verified
- `python3 containers.py` — both containers and both brands read clean.
- `python3 test_reader.py` — *both folders read clean*, broken folder
  bounced with 5 reasons.
- Grep for `voice.md|skin.md|legals.md|VOICE LEAN` across `.py .md .html`:
  only the dated history lines remain.

## After this lands
Send the zip back to the SET UPs chat: SCHEMA-v3, the brief and the example
docs over there flip to the new names the same day. They're holding on the
old names until this reader accepts the new ones, so SET UP never emits a
folder that bounces.
