# ROBOT SANDWICH

`robot.hunch.co.nz` — a tool for crafting consistent copy into specific
creative containers.

**Feed it. Fix it. File it.** A human feeds in the story and the facts, the
robot writes the copy, the human fixes it up, and the robot hands back the
files.

The engine is a commodity. The container design is the expertise. Clients pay
for the set up of a container; using it is included.

## The trick

Copy and terms are two different engines and they don't talk to each other.

**Terms are assembled.** Clause library, type conditionals, date arithmetic, all
in Python. The model never sees this and can't paraphrase it. Most clauses are
fixed; the handful that vary get a checkbox.

Those checkboxes are doing double duty. The optional clauses are precisely the
ones our reference examples disagree about. Every tick is a client answering a
question we'd otherwise have to ask in a meeting. **The UI does the research.**

**Copy is written.** The robot does the prose only. Where a container declares a
placeholder rule it's forbidden from writing any number or date as a literal; it
uses placeholders that Python fills from *the same facts that built the terms*.

One source of truth, two renderings, so the words and the terms cannot
structurally drift apart. The check runs before anything reaches the screen and
surfaces as flags — nothing is silently corrected, because a tool that quietly
fixes itself is a tool nobody learns to trust.

## The folders are the product

Nothing per-client or per-container lives in the code. A format is two folders,
and the engine reads both.

    brands/<id>/         brand.md  brandvoice.md  brandlook.md  brandlegals.md  assets/
    containers/<id>/     config.md spec.md   container.html

- **brand** — one per client. How they sound (`brandvoice.md`, eaten whole by WRITER
  and FIXER), their font and colours (`brandlook.md`, artefact only — every tool
  around it stays Hunch red), and their shared clause library (`brandlegals.md`).
- **container** — one per format, pointing at its brand. What FEED IT asks
  (`config.md`), what gets built (`spec.md`), and the artefact itself with its
  modules tagged.

Containers are built in the SET UP project and uploaded whole. `containers.py`
is the reader; the validator is the same reader in strict mode, and it collects
every reason a folder can't run rather than stopping at the first.

Shipping now: `prize_draw` (live) and `one_update` (testing) — both on the
`one_nz` brand. A `testing` container shows to Hunch logins only.

## Files

| File | Job |
|---|---|
| `app.py` | Flask, blueprint wiring, the doorway, images, `/api/terms`, `/api/parcel` |
| `containers.py` | The reader. Folders → one dict each. The validator is strict mode. |
| `engine.py` | Deterministic. Facts from NEEDS, clauses from LEGALS, the copy check. The model never touches it. |
| `copy_stage.py` | The only part the model touches. `/api/copy`, `/api/tweak`, `/api/feeder`, `/api/search` |
| `file_it.py` | The takeaway counter. The copy doc, the pics zip, the wrap. No model. |
| `auth.py` | The door. A word today, OTP when clients arrive. |
| `prompts/*.md` | The workers — writer, fixer, feeder, search, reader. They never mention a container. |
| `static/index.html` | The whole UI |
| `static/robot.css` | The whole stylesheet |
| `static/tokens.css` | Hunch design tokens, lifted from Prompter |

Blueprints are additive — adding a room touches nothing that already works.

**There is one copy of the front end and it lives in `static/`.** A second copy
at the repo root forked once and cost a sitting's work; don't reintroduce one.

## Deploy

1. New GitHub repo, push this.
2. New Railway project from the repo. Railway reads the `Procfile`.
3. **Mount a volume at `/data`** and set the paths below at it. Without it a
   redeploy eats the tweak log and every uploaded image.
4. Set variables.
5. Point `robot.hunch.co.nz` at the Railway domain.

| Variable | Needed | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | |
| `SECRET_KEY` | yes | Any long random string. Changing it signs everyone out. |
| `ROBOT_STORE` | yes | Set to `/data/robot_store.jsonl`. The tweak log is the asset — off the volume it dies on every redeploy. |
| `ROBOT_MODEL` | no | Defaults to `claude-opus-4-8`. |
| `ROBOT_WORD` | no | The magic word. Defaults to `unicorn`. |
| `ROBOT_WORDS` | no | Per-person words: `unicorn:Suz,taniwha:Michael`. Wins over `ROBOT_WORD` and buys HELLO &lt;NAME&gt; for free. |
| `ROBOT_HUNCH` | no | Names that count as Hunch, comma separated. Defaults to `Michael`. Hunch logins see containers in testing. |
| `ROBOT_DOOR` | no | `word` (default) or `otp`. |
| `RESEND_API_KEY` | no | OTP mode only. Unset = codes print to the log. |
| `ROBOT_FROM` | no | OTP mode only. Must be a verified Resend domain. |
| `ROBOT_IMAGES` | no | Leave unset. Uploaded pics are scratch — a run id doesn't survive a refresh and nothing cleans them up, so the container's disposable disk is doing the housekeeping for free. Revisit when the run store lands. |
| `ROBOT_WRAPS` | no | Built files. Temp by nature, rebuilt on every WRAP IT. |
| `ROBOT_BRANDS` `ROBOT_CONTAINERS` `ROBOT_PROMPTS` `ROBOT_EXAMPLES` | no | Path overrides. Default to the folders beside the code. |

Local: `pip install -r requirements.txt && SECRET_KEY=dev python app.py`

Tests: `python test_engine.py && python test_reader.py`, then `node smoke_ui.js`
against a running server (`npm install jsdom` first). All three are scripts, not
pytest — run them directly.

## The door

**A magic word.** It's `unicorn`. Anyone who knows it gets in — no email, no
codes, no Resend account needed. Case and spacing don't matter.

The caveat, stated once: a shared word is a shared secret sitting in front of an
API key that bills you. Fine while it's you and a couple of people you've told
in person. Before it goes near a client — or anywhere it might get pasted into a
Slack channel — set `ROBOT_DOOR=otp` and you're on six-digit codes to a
whitelisted address instead. That code is written and working; it just needs a
Resend key.

In OTP mode, widen the door in `auth.py`:

- `WHITELIST` — individual addresses
- `ALLOWED_DOMAINS` — whole orgs, and it doubles as the tenant lookup, so
  `"one.nz": "One NZ"` lets the building in and labels them in one line

Sessions last 24 hours either way. Five wrong words from one address and the
door stops listening for a minute.

## The memory

Every tweak — the note, the before, the after, whether the robot declined —
persists to `ROBOT_STORE`, container-tagged so formats don't cross-contaminate.
Peeks at a clause land there too.

The log always records. The prompt only eats what a Hunch human has curated;
until that view exists it folds in the twelve most recent notes for the
container. Curation is the gate on the learning loop.

## Still open

**The clause library is the weak part and it's waiting on Suze.** Three real
examples produced three different shapes:

- *Practical Magic 2* — the plural competition. Modelled.
- *DOC Backcountry Hut Pass* — singular, third-party fulfilled, nested prize
  sub-clauses. Partly modelled; the nesting isn't.
- *Ticketmaster/Live Nation presale* — **a different genus entirely.** No draw,
  no winners, no prize. Access window, purchase cap, third-party terms. Not
  modelled at all, and it needs offer-type to become the top-level switch above
  prize-type.

Questions for Suze:

1. How many offer types are there? Sampling can tell us which clauses are fixed;
   it can't tell us what we haven't seen.
2. **Is there a legal-approved master boilerplate all of these were cut from?**
   Worth more than twenty examples if it exists.

Also worth showing her: the live DOC terms have a `urldefense.com` Proofpoint
wrapper around one link — pasted out of Outlook and published. Harmless, but
exactly the class of error a human makes and a machine wouldn't.

## Known gaps

- **One model for every worker.** `ROBOT_MODEL` is used by WRITER, FIXER, FEEDER
  and EXTRACT alike. The plan splits them — the craft moment gets the big model,
  everything the client waits on gets the fast one. Not built.
- **No prompt caching.** The voice-and-specs prefix is 3–4k tokens and goes up
  in full on every call. The plan says it's cached. It isn't.
- **The PDF is stubbed.** FILE IT builds the copy doc and the pics zip; the
  sign-off PDF is greyed with "Not on the menu yet."
- **`voice_examples.json` doesn't exist**, so the gold-copy block never reaches
  the prompt. The slot is wired and waiting.
- **EXTRACT is still live** although the site plan retires it in favour of the
  FEEDER reading the dump itself.
- **THINKING's CSS is inline** in `index.html` pending a stylesheet sync. Fold it
  into `robot.css` and delete the `<style>` block.

The full backlog is `ROBOT-SANDWICH-hit-list-v5.md`; the frame is
`ROBOT-SANDWICH-site-plan-v3.md`. Per-version detail lives in `changelog/`.

*Honest.*
