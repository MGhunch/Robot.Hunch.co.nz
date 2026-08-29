# ROBOT — Prompt Architecture Plan
*v004 → v005 · August 2026*

---

## The shape of it

Three prompts, three jobs, one direction of travel:

```
Free-form event text
      ↓
[1] RESOLVER  →  BEFORE I GO card  →  human confirms
      ↓
[2] DIGGER    →  tick-what-goes-in  →  human vets facts
      ↓
[3] COPYWRITER →  copy room  →  human tweaks / locks
```

A human gate sits between every stage. Web content never reaches the
copywriter unvetted — that's a quality principle and a prompt-injection
safety principle in one.

---

## Prompt 1 — THE COPYWRITER (live, v004)

**Job:** Write the email copy. Nothing else.

- Anchored to the four One NZ voice pillars: Proudly Kiwi, Fun and
  Funny, Energetic and Adventurous, Smart.
- Framed as an enthusiast, not a cheerleader — finds the human hook.
- Leads with positive instruction rather than prohibitions.
- **Dynamic injections at call time:**
  - Terms-fed facts from the brief (locked, tinted in the copy room)
  - The 12 most recent distinct correction notes from `robot_store.jsonl`
  - Gold-standard examples from `voice_examples.json` (slot wired,
    awaiting content)
  - *New in v005:* human-ticked findings from the Digger
- **Escape valve:** the `wants` field — flags thin source material
  instead of generating hollow copy.
- **Boundary:** never sees raw web pages or unvetted search output.

**Status:** Live. Only change needed for v005 is accepting ticked
findings as an input alongside terms facts.

---

## Prompt 2 — THE RESOLVER (new, "baby search")

**Job:** Turn free-form human input into one verified, actual event.

- Max **2 web searches**.
- NZ context by default — if an event has a NZ leg, that's the one.
- Returns JSON: `status` (`found` / `ambiguous` / `not_found`),
  the resolved event (name, venue, city, dates), alternates if
  ambiguous, a plain-English `note` for the human, and a one-line
  `dig_plan`.
- Explicitly allowed — required — to say an event doesn't exist.
  (Test case: Fleetwood Mac. Not touring. Never will be.)
- **Feeds:** the BEFORE I GO card. `note` + `dig_plan` become the
  card copy.
- **Gates:** GO DIG stays disabled (or becomes "PICK ONE") until
  status is `found`.

**Personality:** caution. Its only failure mode is guessing.

---

## Prompt 3 — THE DIGGER (new)

**Job:** Gather sourced raw material a copywriter could turn into
a hook. Runs only after the human confirms the resolved event.

- Max **4 web searches** (make this a config knob if cost/depth
  needs tuning later).
- Returns JSON: `findings` (each = fact + why it might matter +
  source name + source URL), `conflicts`, and `thin_ice`.
- **No source, no fact.** Every finding carries a real URL it
  actually visited.
- Source hierarchy: promoter / venue / artist / established media
  over forums and fan wikis.
- **Hard exclusions:** ticket prices and resale, artists' health or
  personal lives, rumours, competition mechanics, legal terms
  (Suze's territory).
- Reports conflicts rather than resolving them. Says when pickings
  are thin — a short honest list beats padding.
- **Feeds:** the tick-what-goes-in UI. Each finding renders as a
  checkbox row with linked source.

---

## Not prompts, but part of the prompt system

- **The tweak log** — `robot_store.jsonl` corrections injected into
  the Copywriter every call. The compounding quality lever.
  (Reminder: Railway volume setup still pending, or this gets wiped
  on redeploy.)
- **`voice_examples.json`** — slot wired, waiting on gold copy
  from Michael.

---

## Decisions still open

1. **Ticked findings in the copy room:** editable or locked?
   Recommendation: **editable** — it's raw material, not legal.
   Gets a "robot found this" tint, distinct from the locked
   terms-fact treatment.
2. **Dig search cap:** hardcode 4 or expose as config? Start
   hardcoded, promote to config if it ever pinches.
3. **Ambiguous-state UX:** when the Resolver returns alternates,
   does the BEFORE I GO card render them as pickable chips, or
   does the human retype? Chips feels right; needs a small UI pass.
4. **Model split:** Resolver and Digger don't need Opus. Sonnet
   for both keeps the research loop cheap; Opus stays on the
   copy. Worth confirming quality holds.

---

## Build order (suggested)

1. Resolver endpoint + BEFORE I GO card wiring (incl. the
   `not_found` / `ambiguous` states)
2. Digger endpoint + tick-what-goes-in UI
3. Pipe ticked findings into the Copywriter's context with the
   "robot found this" tint
4. Config knob / model-split decisions as a tidy-up pass

---

*One-directional pipeline. Human gate at every stage. The robot
digs; the humans decide.*
