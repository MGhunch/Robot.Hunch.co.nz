# ROBOT v008 — the FIX IT release
*27 August 2026 — built on the v007 zip. Flag: this base had ONE entry in
voice_examples.json where the hit list says three — reconcile on merge.*

## The prompts moved out (new: /prompts)
Markdown files, hot-reloaded on change (no restart), embedded fallbacks if
a file goes missing. The folder maps §5: engine prompts flat, container
prompts in folders.
- prompts/spine.md — the voice, verbatim from v007
- prompts/write_it/prize_draw.md — the enthusiast's task card, now returns
  "why": one beat per block, anchored to the why-care. Feeds the tour.
- prompts/tweak_it.md — NEW: the surgeon. Smallest change that honours the
  note. Returns {say, copy, declined, wants}.
- prompts/extract.md — unchanged, relocated
- prompts/feed_it/prize_draw.md — reserved slot

## copy_stage.py
- prompt() loader with mtime cache
- /api/tweak is the surgeon: takes highlight + insight, returns say/copy/
  declined/wants (legacy message/proposal/pushback mirrored one release)
- Tweak log entries carry "container":"prize_draw" (hit list #10);
  _voice_now filters by container, untagged legacy entries count as
  prize_draw

## static/index.html — the Wrangler split (hit list #12)
- Stepper renamed: FEED IT / FIX IT / FINISHED (hit list #1)
- Step 2 rebuilt: full-bleed red stage, the email as the artefact (mail
  chrome, subject in the bar), rail on the right
- Padlock gutter between: three states (open / pencil / shut), padlocks
  are the buttons. Terms is read-and-nod — lock only, tweak fires the
  DON'T TOUCH modal
- Tour: robot walks subject → headline → body → terms, one why-beat per
  block from the model, TWEAK IT / LOCK IT in the rail
- Chat: the card is the proposal — rewrites land with word-diff marks and
  a pulse; subject TWEAK IT serves the other two from the drawer
- Highlight-to-tweak, snapped to whole words; highlighting a filled fact
  (.ph) or the terms fires DON'T TOUCH
- GOOD TO GO footer: padlock→tick icon, live "n of 4 locked" counter,
  PACKAGE IT UP goes solid at four
- START AGAIN removed

## Not touched
terms.py, auth.py, app.py routes, the FEED IT step, FINISHED/parcel.
README still drifts (hit list #22) — one pass once section A closes.

---

# v009 additions — the hamburger
*Same day, on the v008 base.*

## static/index.html — ABOUT and FAQS in the house
- Hamburger top-right in the topbar (folds to an X), two-item menu:
  ABOUT and FAQS, both opening as modals on the house shade pattern
  (same scrim as DON'T TOUCH, own z-band above the menu).
- ABOUT: the final approved copy — squirting words, a good story,
  finished in a flash. Paper card, red-dot title, beer-mat sized.
- FAQS: six questions as a concertina, first open by default, one open
  at a time. Bebas questions going red on open, Inter answers.
- Closes on X, scrim click and Escape; click-away shuts the menu.
  Reduced motion already respected by the global rule.
- Pre- and post-sign-in: the menu sits in the topbar, so About and FAQs
  are readable at the door and from inside the rooms.

## voice_examples.json — reconciled per the v008 flag
- v008's base had one entry; v007 had three. Merged to four: LOMU story,
  DOC roam-further, LOMU headline formula, plus v008's "The curse is
  back. Want in?"
