# SET UP — the plan from here
*4 September 2026. Where folders live, how you work on them, and how they
go live. Written before building, because the shape moved a long way this
afternoon and it should be read back before it's code.*

---

## THE MODEL, IN ONE PARAGRAPH

Folders live in two places and they mean different things. **The server** is
where you work: saves are instant, there's no deploy, and nothing there is
ever shown to a client. **Git** is what's landed: it has the history, the
revert, and it ships the folders in the same commit as the engine that
reads them. Hitting **LAND IT** moves a folder from the server into git,
and that — nothing else — is what makes it live.

One sentence decides every awkward case: **clients only ever see git.
Hunch sees the server laid over the top.**

---

## WHY NOT THE OTHER TWO

**Not a database.** `containers.py` is a file reader — `open()`,
`os.listdir`, `os.path.isfile`. A database means rewriting the reader, or
writing files out of the database on boot, which is a cache with extra
steps. And the content fights it: these are markdown documents full of
prose, comments and tables the reader deliberately carries through
untouched. SCHEMA-v3 already ruled on this and it was right. The things a
database is better at — many writers, querying across records — you have
none of.

**Not the server alone.** One disk, one region, no history, no diff, no
undo. Get an edit wrong and the previous version doesn't exist anywhere.
The original SET UP CHECK spec proposed exactly this, with "commit a zip on
flip day" as the backup — a habit doing a seatbelt's job.

**Not zips into git either.** A zip is one opaque blob. Git will store
forty of them, but you can't diff it, can't see what changed, can't revert
one line. Writing the *files* is the same amount of work and gives a real
diff. If we're talking to GitHub at all, we write files.

---

## HOW IT FEELS TO USE

**Home page.** A list of every brand and container the app can see, each
saying what it is, whether it's live or testing, and where it lives. Two
buttons on top to start a new one. Anything with an uncommitted working
copy is flagged **edited, not landed**, with **discard** beside it and
**LAND IT** on the row. That flag is the whole safety of the model: you
cannot quietly forget a change you made on Tuesday, because the list says
so every time you walk in. See `MOCK-setup-home.html`.

**Starting something new.** Drop the zip, as now. It lands on the server as
testing.

**Picking up something live.** Click EDIT on a live folder and it takes a
copy to the server. The live one carries on serving clients untouched while
you work. It's a checkout, not an edit-in-place.

**Working.** Saves are instant and Hunch-only. Every save re-reads the
folder and re-runs the validator, so a change that breaks it says so at the
moment you make it.

**Landing it.** LAND IT writes the files into git as one commit, message
taken from the changelog line the edit already wrote. Railway redeploys.
The server's working copy is cleared, so there is never a moment with two
versions of the same folder alive at once.

---

## THE FOUR BUILDS, IN ORDER

### v044 — the server, and the home page
The day-to-day win, and it needs no GitHub token.

- Point `ROBOT_BRANDS` / `ROBOT_CONTAINERS` at the volume. The reader
  already takes both from the environment, so this is a Railway setting.
- The reader learns to look in two places: git's folders as the floor, the
  volume's laid over the top. `_visible()` already gates testing folders to
  Hunch logins; the same gate covers anything with a working copy.
- The home page: the list, the two new-buttons, the edited-not-landed flag,
  discard.
- Scratch stops being `/tmp`. Today a restart or a redeploy wipes a
  half-edited folder with no warning — a bug shipped in v043 and the most
  urgent thing in this document.

**Decides:** what happens when the same id is in both places. Answer: the
server's copy wins *for Hunch only*, and landing clears it.

### v045 — LAND IT
- A fine-grained GitHub token, one repo, *Contents: read and write*, in
  Railway's variables. Nothing else — it can't see another repo, can't
  change settings, can't touch Actions.
- One commit per landing, all files together, so it reads like any other
  commit in the history.
- **The app refuses any path that isn't under `brands/` or `containers/`,
  enforced in the code.** The checker can never write engine code, by
  accident or otherwise.
- Refuses to land a folder that doesn't read clean.
- No token set means LAND IT simply isn't offered, and the download carries
  on as it does today. Nothing breaks if you'd rather not.

### v046 — the container editor
**This is the point of the whole thing**, and everything above is the
scaffolding that makes it safe.

The target, in Michael's words: *"it should show a thing and I should be
able to say 'not that font in the headline, this one' and it changes and I
confirm and then commit to send it live."*

Which means the robot doing the editing, not a form:

- You're looking at the artefact. You say what's wrong in the chat.
- The robot works out which file that lives in — `container.html` for the
  look, `config.md` for what's asked, `spec.md` for the modules and limits
  — and makes the smallest change that answers it.
- It shows you the change and what it touched. You confirm or you don't.
- Confirmed edits are surgical and changelogged, exactly as the brand's
  typed edits already are.
- The render on the left updates, the validator re-runs.

Three things this needs that don't exist yet: the scoped prompts (one robot
per file, each eating SCHEMA-v3 plus only its own file), an undo per edit,
and a diff the human can actually read before confirming. The brand editor
in v043 built the write lane and the changelog discipline this stands on.

Worth flagging honestly: *"not that font in the headline, this one"* is a
`container.html` change, and there is currently nowhere in the schema for a
container to declare that its look departs from its brand's. That's the
LOOK SPECIFICS ask already briefed to the SET UPs project. Without it the
change lands in the CSS and nothing can check it.

### Later — the project pulls from git
An endpoint the SET UPs project fetches when it wants a current example,
instead of me couriering reference zips that are stale by Tuesday. Nearly
free once the home page exists — same data. Parked, agreed.

---

## THE RULES THIS ALL RESTS ON

1. **Clients only ever see git.** The server is Hunch's workbench.
2. **Editing something live is a checkout.** The live copy is never
   modified in place.
3. **Landing clears the working copy.** Two versions of one folder never
   coexist.
4. **Edits are surgical, never regenerated.** Replace the hex inside its
   line, one `**Key:**` line, one `##` section, one table cell. The
   comments, ordering and human prose come out untouched.
5. **Gaps get asked for, never invented.** A named-but-absent file is an
   upload slot. The checker will not go and find one.
6. **The app can never write code.** Path allowlist, enforced.
7. **Nothing lands that doesn't read clean.**

---

## THE BRAND'S THREE SECTIONS, CONFIRMED AGAINST THE CODE

Split by file, because a section spanning two files makes "which file did
that change?" a question you re-answer every time.

| Section | File(s) | What the engine takes |
|---|---|---|
| **LOOK** | `brandlook.md` + `assets/` | font lines, logo, mark, every colour hex; the file list, checked against what the lines name |
| **PROMPT** | `brandvoice.md` | the whole file, eaten by WRITER and FIXER |
| **LEGALS** | `brandlegals.md` *(optional)* | the clause library containers pull with `@brand` |

`brand.md` isn't a section — it's the nameplate, and where every changelog
line lands. v043 shipped five sections; three replaces them. The fix isn't
only tidiness: FONTS and ASSETS were on separate screens, which put the
font *line* and the font *file it names* apart — and seeing those two
together is the entire lesson of the Bebas bug.

A container is `config.md`, `spec.md`, `container.html`. All three
required.

---

## WHAT I'D WANT SETTLED BEFORE v044 STARTS

1. **The overlay rule** — server wins for Hunch, git is what clients see,
   landing clears the working copy. Confirm and it's law.
2. **LAND IT on the home page row** — worth having, or should landing only
   happen from inside the folder where you can see it's clean? The mock
   shows it on the row.
3. **Discard** — throws away the working copy with no undo. A confirm step,
   or send-and-pray?

*Honest.*
