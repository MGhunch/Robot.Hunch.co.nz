# BRIEF — to the SET UPs project
*4 September 2026, from the engine. Two needs, both surfaced by dropping
real folders into the SET UP CHECK page. Plus the housekeeping SCHEMA-v3
owes the reader since v042.*

---

## NEED 1 — brand and container are two jobs, not one handover

**What we found.** The check page was built as one room: a brand stop
followed by three container stops. It has a "waiting" state, and that state
exists purely because the room can't tell which job it's doing. Michael's
words: *"Currently we're trying to do both at once and it's confusing me and
the robot."*

**The split.** Two doors, and the engine is being rebuilt this way:

- **BRAND SET UP** — the brand folder, on its own. Fonts, assets, colours,
  legals, prompt. Asked once per client.
- **CONTAINER SET UP** — the container folder, against a brand that already
  exists. Asked once per format.

The dependency is one-way and it's the whole logic: **you cannot have a
container without a brand, but you can set up a brand without a container.**

**What that asks of SET UP.** Emit them as two deliverables, not one bundle
— a brand folder handed over when the brand is done, containers handed over
as each format is done. Each zip should hold one job's folders. That's
already what happens in practice (the Hunch brand arrived alone this
morning); this is asking for it to be the declared shape rather than an
accident of what happened to be finished.

Nothing about the folder contents changes. Two jobs, two handovers.

---

## NEED 2 — a container has to declare where its look bends

**What we found.** Hunch's brandlook names Bebas Neue for headlines. An
email can't reliably load a webfont, so the Hunchmail container will use
safe fonts and Bebas will never touch it. That is a correct and deliberate
decision — and there is nowhere in the schema to say it.

**It's already happening, unchecked.** In the live repo today:

    containers/prize_draw/container.html
      --font:    Arial, sans-serif        /* "no client font named" */
      --display: 'Bebas Neue', 'Arial Narrow', sans-serif

    brands/one_nz/brandlook.md
      **Font:** Euclid Circular A. assets/EuclidCircularA-Regular.otf (400) …

So a **One NZ** artefact is wearing **Hunch's** headline font, with a
comment that was true when it was written and isn't now. Nothing anywhere
would tell you. The reader checks that the brand's named files exist; it has
never compared what a container actually wears against what its brand
declares.

**The ask.** spec.md already has `## VOICE SPECIFICS` — *"appended to the
brand voice on every WRITER and FIXER call. Where this format adjusts it,
and no more. Brand stays in the brand folder."* That's exactly the right
idea, applied to the wrong half. The look needs its twin:

    ## LOOK SPECIFICS
    *Where this format's look departs from the brand's, and why. Brand
    stays in the brand folder.*

    **Headlines:** Arial Black, not Bebas Neue — email clients don't load
    webfonts reliably.
    **Body:** as the brand.

One line per departure, with the reason. Silence means "as the brand", which
is the common case and shouldn't need writing down.

**Why it's worth the section rather than leaving it in the CSS.** A
divergence buried in a `:root` block is invisible, unversioned and
unarguable. Declared, it's checkable — the check page can put what the
artefact wears beside what the brand declares and show the gap, and an
undeclared divergence becomes a validation problem instead of a surprise.

**Decision needed from SET UPs:** whether this is a spec.md section (our
recommendation, mirrors VOICE SPECIFICS) or something the reader infers by
comparing the html to the brand. Inference is cheaper and always wrong at
the edges — it can't tell a deliberate substitution from a mistake, which is
the only thing worth knowing.

---

## Housekeeping — what SCHEMA-v3 owes the reader since v042

All four already shipped; the schema is describing the old behaviour.

1. **Two-font brands are read.** `**Font — headlines:**` and
   `**Font — body:**` both parse. The compiled dict carries
   `skin.fonts = [{role, text}, …]` in declared order, and `skin.font`
   stays as the first one's words. The workaround note — *"until it lands,
   lead with a plain `**Font:**` line if the blank matters"* — can go.

2. **`**Mark:**` is a real key**, carried beside `Logo`. Hunch declares one
   (the circle h) and the reader used to drop it silently. Worth naming in
   the brandlook section as optional.

3. **A brandlook with no font line bounces.** New validation problem:
   `brand <id>: brandlook.md has no **Font:** line`. Add it to *The
   validator bounces on*.

4. **The compiled cache is stamped with the parser's version.** The note
   saying *"if the parser changes and the folder doesn't, the cache goes
   stale — `touch config.md` clears it"* is no longer true, and neither is
   the renames note's *"touch a file in each folder anyway"*. Both can go.

---

## For reference, and why it matters
`containers/one_update/` and `containers/prize_draw/` — all three files each
— have been sent over as worked examples. Both read clean today. The gap
they close: SET UP was writing containers against prose, and the fiddly bits
(the Bounce it table keyed by need name, the repeating-group heading
grammar, the `when` / `after` / `derive` columns, how LEGALS placeholders
resolve) are exactly where a folder bounces.

*Honest.*
