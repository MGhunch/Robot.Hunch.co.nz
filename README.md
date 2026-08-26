# ROBOT

`robot.hunch.co.nz` — a front door with one room in it.

Room one is **ticket giveaways** for One NZ Rewards. Answer a few questions, the
terms get assembled from your answers, the robot writes the copy, you tick it or
tweak it, and it comes out as a parcel the marketing automation specialist can
take straight into Salesforce Marketing Cloud.

## The trick

Copy and terms are two different engines and they don't talk to each other.

**Terms are assembled.** Clause library, prize-type conditionals, date
arithmetic in Python. The model never sees this and can't paraphrase it.

**Copy is written.** The robot does hook, headline, body — prose only. It's
forbidden from writing any number or date as a literal; it uses placeholders
that Python fills from *the same facts that built the terms*.

One source of truth, two renderings, so the words and the terms cannot
structurally drift apart. Two checks run before anything reaches the screen:
code compares the numbers, and the robot reads for semantic drift. Both surface
as flags — nothing gets silently corrected, because a tool that quietly fixes
itself is a tool nobody learns to trust.

## Deploy

1. New GitHub repo, push this.
2. New Railway project from the repo. Railway reads the `Procfile`.
3. Set variables:

   | Variable | Needed | Notes |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | yes | |
   | `SECRET_KEY` | yes | Any long random string. Changing it signs everyone out. |
   | `RESEND_API_KEY` | no | Unset = codes print to the Railway log. Fine while it's just you. |
   | `ROBOT_FROM` | no | Must be a verified Resend domain. |
   | `ROBOT_MODEL` | no | Defaults to `claude-sonnet-4-6`. |

4. Point `robot.hunch.co.nz` at the Railway domain.

Local: `pip install -r requirements.txt && SECRET_KEY=dev python app.py`

## The door

Currently open to **michael@hunch.co.nz only**. Widen it in `auth.py`:

- `WHITELIST` — individual addresses
- `ALLOWED_DOMAINS` — whole orgs, and it doubles as the tenant lookup, so
  `"one.nz": "One NZ"` lets the building in and labels them in one line

Codes live in memory, so a restart just means typing your email again. Sessions
last 30 days.

## Files

| File | Job |
|---|---|
| `app.py` | Flask, blueprint wiring, `/api/terms` and `/api/parcel` |
| `terms.py` | The deterministic half. Clause library, dates, validation. |
| `copy_stage.py` | The only part the model touches. `/api/copy`, `/api/tweak` |
| `auth.py` | OTP, whitelist, `require_auth` |
| `static/index.html` | The whole UI |
| `static/tokens.css` | Hunch design tokens, lifted from Prompter |

Blueprints are additive — adding a room touches nothing that already works.

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
1. Are the expenses / liability / substitution clauses standard boilerplate, or
   conditional on a third party being involved? The three examples disagree.
2. Open time varies (12:00am, 12:00pm, 9:00am). Currently hardcoded to midnight.
3. How many offer types are there? Sampling can tell us which clauses are fixed;
   it can't tell us what we haven't seen.
4. **Is there a legal-approved master boilerplate all of these were cut from?**
   Worth more than twenty examples if it exists.

Also worth showing her: the live DOC terms have a `urldefense.com` Proofpoint
wrapper around one link — pasted out of Outlook and published. Harmless, but
exactly the class of error a human makes and a machine wouldn't.

## Next

- `TWEAK_LOG` in `copy_stage.py` is in memory. **Move it to a real store before
  any volume** — those recorded judgements about what good sounds like are the
  actual asset here, and they're impossible to reconstruct later.
- The parcel screen shows the files but doesn't build them yet. Needs the docx
  writer and a zip.
- Hero image handling — currently a placeholder in the HTML block.
