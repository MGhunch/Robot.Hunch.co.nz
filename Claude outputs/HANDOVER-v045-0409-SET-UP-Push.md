# HANDOVER v045 — 4 Sep 2026 — SET UP: drafts, home page, push

## Project
**Robot Sandwich** — robot.hunch.co.nz. Flask on Railway. Clients feed it copy,
it fits that copy into creative containers (emails, banners, cards) built to a
brand's rules. Repo `MGhunch/Robot.Hunch.co.nz`.

## Session Focus
Built **SET UP** end to end — the Hunch-only room where a brand or container
folder can be eyeballed, edited and sent live without testing through the
machine. Six builds: v040 the room, v041 the menu link, v042 brand-only drops
and two fonts, v043 two doors plus surgical editing, v044 drafts on the volume
plus the home page, v045 push to GitHub.

The purpose, in Michael's words: *"Can we eyeball the exact mock, the exact
output and the exact deets (and edit and refine them) WITHOUT testing through
the machine."*

---

## The model, because everything rests on it

    the volume   a DRAFT. Instant saves, no deploy, Hunch's eyes only.
                 Survives restarts and redeploys.
    git          what has LANDED. History, revert, and the folders ship in
                 the same commit as the engine that reads them.

**Clients only ever see git. Hunch sees the volume laid over the top.** One
sentence, and it settles every awkward case — an unpushed edit can look wrong
to you and can't reach anybody else.

Opening something live is free. The first edit is the checkout:
`draft_dir(..., make=True)` copies the folder to the volume and writes there.
Discard throws the copy away; what landed is untouched.

---

## Files Changed

**New**
- `setup_room.py` (v040, rewritten v044) — the drop door and the drafts folder.
  `DRAFTS` defaults to `/data/drafts` when `/data` exists, `/tmp` locally.
  Zip safety: no absolute paths, no `..`, no symlinks; 400 files, 8MB each,
  40MB total.
- `setup_edit.py` (v043) — four surgical edits. Header rule, and it means it:
  **EDITS ARE SURGICAL. NEVER REGENERATE A FILE.** `set_hex`, `set_line`,
  `set_section`, `set_cell`, plus `log()` for the dated changelog line and
  version bump. Measured: two edits to Hunch's brandlook changed 2 lines of 23.
- `setup_push.py` (v045) — the push lane. Blobs → tree hung off the current
  one → commit parented on HEAD → PATCH the ref. One commit, or nothing.
- `static/js/deets.js` (v040) — the checklist lifted out of `feed.js`
  (1,324 → 675 lines), mounted with a five-callback host.
- `changelog/CHANGES-v040.md` … `CHANGES-v045.md`.

**Replaced**
- `containers.py` — reads two places (`brands(drafts=True)`), two-font support,
  `folders_at()` contextmanager, and `PARSER = 42` in the cache stamp so a
  parser change invalidates the cache by itself.
- `app.py` — the SET UP API: `/api/setup/list`, `/drop`, `/open/<kind>/<fid>`,
  `/discard`, `/push`, `/asset/*`, `/edit`, `/download`, `/held`.
- `static/js/setup.js` — home page and folder room. `SETUP_RAILS`: brands are
  look / prompt / legals, containers are mock / deets / output.
- `static/js/strings.js` — all SET UP words under `STR.setup`.
- `static/js/chrome.js` — `GHOST()`, `menuAdd`/`menuHunch`, `shadeOpen()` split
  out of `menuOpen()`.
- `static/index.html`, `static/robot.css` — the room and its block.

**Uncommitted in the working tree right now** (v044 + v045 together):
modified `app.py`, `containers.py`, `setup_room.py`, `static/index.html`,
`static/js/setup.js`, `static/js/strings.js`, `static/robot.css`; new
`setup_push.py`, `changelog/CHANGES-v044.md`, `changelog/CHANGES-v045.md`.

---

## Decisions Made

**Not a database.** `containers.py` is a file reader — `open()`, `os.listdir`.
A database means rewriting it, or writing files out of a database on boot,
which is a cache with extra steps. The content is markdown prose the reader
carries through untouched. SCHEMA-v3 already ruled on this.

**Not the volume as the source.** One disk, no history, no undo. Right for
work in progress, which is not the same as being the source.

**Not zips into git.** A zip is one opaque blob — no diff, no line-level
revert, no answer to "what changed on Tuesday". Writing the files costs the
same API call and gives a real history.

**Two doors.** SET UP BRAND / SET UP CONTAINER. You can't have a container
without a brand; you can have a brand without a container. Doing both at once
was confusing Michael and the robot.

**Three sections, not five** — split by file, so "which file did that change?"
isn't a question you re-answer every time. LOOK = `brandlook.md` + `assets/`.
PROMPT = `brandvoice.md`. LEGALS = `brandlegals.md`. v043's five split
`brandlook.md` three ways, which put the font *line* and the font *file it
names* on separate screens — and seeing those two together is the entire
lesson of the Bebas bug.

**The list navigates; the room acts.** Every row says EDIT. Push lives inside
the folder, because push has to refuse something that doesn't read clean and a
list can't know that. Michael: *"You can only push from the inside."*

**States**: LIVE (ink) / TESTING (grey) / DRAFT (red), as a word at the front
so the column scans.

**Push, not "push it".** And no yellow.

---

## The push lane, specifically

**The allowlist** is the only thing between a folder id and the engine code:

    brands/<id>/...        the folder being pushed, and only that one
    containers/<id>/...

Every path is checked before a single blob is posted. Tested with
`static/hunch`, `brands/../../app`, `brands/hunch/../..` — all three refused.

**Three gates in front of it**: it has to be a draft; it has to read clean
(the validator runs again server-side — the button's check is a request, not a
permission); and a container can't go live ahead of its brand.

**Deletions travel** as `sha: None`, so a file pruned from a draft is removed
rather than left behind — which is why the allowlist matters, a delete is a
write.

**The token**: fine-grained PAT, one repo, Contents read and write, in Railway
as `GITHUB_TOKEN`. No token means the button isn't offered and the download
carries on as always.

---

## Still Broken / Known Issues

- **The first real push is untested.** It couldn't run from the build sandbox
  because the token lives in Railway. Everything up to the API call is
  verified; the call itself is Michael's to make.
- **The container side is read-only.** No editing yet — that's v046.
- **DEETS renders empty.** Needs reference facts, which needs a SCHEMA-v3
  decision first.
- **`test_engine.py` fails** ("Tickets is blank") — identically on `main` and
  here. An out-of-date fixture, deliberately not touched.
- **`prize_draw/container.html` sets `--display:'Bebas Neue'`** — Hunch's face
  on a One NZ artefact. There is nowhere in the schema for a container to
  declare that its look departs from its brand's. Briefed to SET UPs as the
  LOOK SPECIFICS ask; until it exists, a font change lands in the CSS where
  nothing can check it.
- **One pixel-diff artefact in v044** (`05-doorway-tile-fail`, an arrow disc):
  chased properly, base engine + new front end matched baseline, new engine +
  old front end matched baseline, only both together differed. Paint timing.
  Did not recur in v045 — 22/22 clean — which settles it.

---

## Next Session

- [ ] **Michael commits and deploys v044+v045**, then presses PUSH for real.
- [ ] **v046 — the container editor.** The point of the whole thing.
- [ ] Carry three things to the SET UPs project by hand:
      `BRIEF-to-SET-UPs-two-needs.md`, `reference-containers.zip`, and the
      SCHEMA-v3-owed list (two-font form, `**Mark:**`, the no-font-line bounce,
      and dropping the "touch config.md" cache note — `PARSER` handles it now).
- [ ] Decide reference facts so DEETS can render filled.

---

## Context for Next Time

**v046 is the target, in Michael's words:** *"it should show a thing and I
should be able to say 'Not that font in the headline, this one' and it changes
and I confirm and then commit to send it live."*

Which means the robot doing the editing, not a form. You're looking at the
artefact; you say what's wrong in the chat; the robot works out which file
that lives in — `container.html` for the look, `config.md` for what's asked,
`spec.md` for the modules and limits — makes the smallest change, shows you
the diff, and you confirm.

Three things it needs that don't exist yet:

1. **Scoped prompts** — one robot per file, each eating SCHEMA-v3 plus only
   its own file. Not one robot with three files and good intentions.
2. **Undo per edit.**
3. **A diff a human can actually read** before confirming.

The write lane and the changelog discipline it stands on are already built —
`setup_edit.py` from v043. Start there, and read
`claude/ROBOT-SANDWICH-setup-v044-plan.md` in the project for the reasoning
behind the model before changing any of it.

**Where the pieces are**: `setup_room.py` owns drafts, `setup_edit.py` owns
writes, `setup_push.py` owns git, `app.py` owns the gates, `setup.js` owns the
room. `smoke_gates.sh` enforces the architectural boundaries as an executable
test — a room may call the chrome, the chrome never knows a room exists. Run
it, `smoke_errors.js` and `smoke_ui.js` before shipping anything.

**House rules, still in force**: don't code without confirming; ship a patch
zip named `robot-vXXX.zip` with `changelog/CHANGES-vXXX.md` at the top,
listing new, replaced, and anything to delete by hand.

*Honest.*
