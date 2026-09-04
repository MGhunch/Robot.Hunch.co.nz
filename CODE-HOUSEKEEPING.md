# CODE HOUSEKEEPING

*4 September 2026 — a read of the repo at v039. Five things worth doing,
none of them urgent today, two of them urgent before a client sees this.*

Nothing here is a rewrite. The architecture is sound and the housekeeping
list is short because of that. Items are ordered by when they bite, not by
how much work they are.

---

## 1. The Procfile doesn't pin its worker count

**Where** `Procfile`

```
web: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
```

**What's wrong** Three pieces of state live in process memory and assume
there is exactly one process:

| State | File | What breaks with two workers |
|---|---|---|
| `TWEAK_LOG` | `copy_stage.py` | Each worker folds a *different* half of the corrections into the voice. `/api/log` shows whichever half you happened to hit. Nothing is lost on disk — `_persist` appends to the same file — but the feedback loop goes partial and silent. |
| `_misses` | `auth.py` | The brake becomes 5 tries **per worker**. Five workers is twenty-five guesses a minute, not five. |
| `_codes` | `auth.py` | A code minted by worker A cannot be verified by worker B. Roughly half of all logins fail with "No code outstanding for that address." |

Gunicorn's default is one worker, so today this is all fine. The trap is
that Railway sets `WEB_CONCURRENCY` on some configurations, and gunicorn
reads it — so the number can change without anyone editing the Procfile.

**Why it matters most** The OTP row is the sharp one. `ROBOT_DOOR=otp` is
the plan before this goes anywhere near a client, and it would fail
intermittently and inexplicably — the worst failure shape there is, because
"try again" works about half the time and nobody files a bug.

**The fix, now** Pin it, so the assumption is written down where it's made:

```
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
```

**The fix, before OTP goes on** One worker is a real answer, not a fudge —
this tool serves a handful of people and spends most of its time waiting on
the Anthropic API, which one worker handles fine. If it ever needs more,
`_codes` and `_misses` have to move somewhere shared (the Railway volume, or
Redis) *first*. Note it in `auth.py` next to the two dicts so the next
person can't miss it.

---

## 2. `SECRET_KEY` has a working default

**Where** `app.py` line 41

```python
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")
```

**What's wrong** If that variable isn't set on Railway, the app boots
happily and signs session cookies with a string that's in a public repo.
Anyone who reads it can forge a session, and `require_auth` — which is on
every route that spends money — becomes decorative. There is no symptom.
The site looks completely normal either way.

**The fix** Two parts.

1. Confirm `SECRET_KEY` is actually set in the Railway variables. Takes ten
   seconds and settles it.
2. Make the code refuse to run without one in production, so it can never
   be true again:

```python
SECRET = os.environ.get("SECRET_KEY")
if not SECRET and os.environ.get("PORT"):        # PORT means Railway
    raise RuntimeError("SECRET_KEY isn't set — refusing to sign cookies with a public string")
app.secret_key = SECRET or "dev-only-change-me"
```

Local development keeps working. A deploy without the key dies loudly at
boot, which is the correct time to find out.

---

## 3. "No source, no fact" switches itself off

**Where** `copy_stage.py`, in `search()` — the run stage

```python
if read and url.split("#")[0].rstrip("/") not in read:
    continue
```

**What's wrong** The `read and` guard means: *if the model returned no
citations at all, don't check anything.* So the one case where every claim
is unsourced is the exact case where the filter stands aside and lets all of
them through.

This matters more than an ordinary edge case because of what the file says
about itself. The header comment calls it a promise, not a request:

> a fact without a citation URL never reaches the screen

and `_cited_urls`:

> a claim whose url isn't in here didn't come from a page, it came from
> memory, and memory is not a source

That's right, and the code should match it. Everywhere else in this repo the
comments are true — this is the one place the prose oversells.

**The fix** Empty citations means nothing was read, which means nothing
survives:

```python
read = _cited_urls(resp)
if not read:
    print("[robot/search] no citations in the response — dropping every fact")
    return jsonify({"success": True, "facts": [], "barred": []})
```

Then the per-fact check loses its guard and becomes an unconditional rule.

---

## 4. A model-supplied URL becomes a link

**Where** `static/js/feed.js` line 916, and `static/js/file.js` line 43

```js
`<a class="search-src" href="${esc(x.url)}" ...>`
```

**What's wrong** `esc()` handles `& < > "`, which stops the attribute being
broken out of — that part is right, and the escaping discipline through
these files is good. What it doesn't do is check the *scheme*. A
`javascript:` URL survives escaping intact and runs on click.

`x.url` comes from the model, and item 3 above is the door it walks through.
The two together are the whole path: uncited response → unfiltered fact →
rendered as a live link.

**The fix** One helper in `chrome.js`, next to `esc`, and used at both call
sites:

```js
const safeURL = u => /^https:\/\//i.test(String(u||'')) ? u : '';
```

Empty href, no link, no drama. Fixing item 3 closes this too, but a
belt-and-brace pair is the house style everywhere else in this codebase
(`_keep_found` is exactly this move) and it belongs here.

---

## 5. `feed.js` is the one thing out of proportion

**Where** `static/js/feed.js` — 1,324 lines, 68KB

**What's wrong** Nothing, yet. It works, and `smoke_gates.sh` stops it
leaking into the other rooms. But it's a third of the front end in one file
of flat globals, where every other file in the repo is sized to what it
does. `fix.js` is 426 lines. `door.js` is 94. This one is five things
wearing a trench coat: the checklist (`deets*`), the chat (`feed*`), the
search panel (`search*`), the dump, and the doc pad.

That's where the next bug will live, and it's where a change will be
hardest to make confidently.

**The fix** Not now, and not in one go. But the seam is already visible in
the naming — the `deets*` functions are ~500 lines that talk to their own
state (`DEETS_*`) and nothing else. Lifting those into `deets.js` would halve
the file and cost almost nothing, and `smoke_gates.sh` would need one new
row to keep the boundary honest. Worth doing the next time the checklist
needs real work, rather than as a job of its own.

**Also** `esc` doesn't escape `'`. Harmless today — nothing in the repo
interpolates into a single-quoted attribute, and I checked. It's one
character to add, and it removes the landmine for whoever writes the first
one.

---

## What not to break

Listed because a housekeeping pass is exactly when good things get tidied
away by someone who doesn't know why they're there.

- **`smoke_gates.sh`** Architectural boundaries enforced as an executable
  test. Most teams talk about this and never build it. If a room needs to
  reach into another room, the gate is right and the change is wrong.
- **`robots.py`** Every model id in one file, resolved against the API's own
  list at boot. A typo is caught on startup, not by a client mid-search.
- **Nothing per-container in code.** The folders are the product;
  `containers.py` reads them and the validator is the reader in strict mode.
  This holds across all 3,200 lines, which is the hard part.
- **One FACTS dict, two renderings.** Copy placeholders and terms clauses
  fill from the same source, so they cannot structurally drift. This is the
  whole trick and everything else is arranged around it.
- **The comments that record scars** — the note in `_call` about joining
  text blocks because `content[0]` isn't promised to be text, and that this
  silently killed the FEEDER after the sonnet bump. That's a logbook. Keep
  writing them.
- **Honest fallbacks.** The FEEDER returning `live:false` so the front end
  never claims the robot spoke. Small, and exactly right.

---

## Suggested order

1. Procfile `--workers 1` — one line, do it now.
2. Confirm `SECRET_KEY` on Railway, then make it fatal.
3. Search citations + `safeURL` — same patch, they're the same bug.
4. `esc` picks up `'`.
5. `deets.js` when the checklist next needs work.

Items 1–4 are a small v040. Item 5 isn't a patch, it's a decision for later.
