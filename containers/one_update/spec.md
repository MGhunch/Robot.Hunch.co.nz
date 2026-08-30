# SPEC — one_update
*What's built. Outputs, modules and lengths, why-beats, the voice lean, the engine's rules, the image sizes. One home for every number. The skin is the brand's (brands/one_nz/skin.md).*

## Outputs (primary first)
| id | name | files emitted |
|---|---|---|
| email | One Update email | copy doc, sign-off PDF, hero + card images |

One output for now. If a web/tile version gets commissioned, it's a new row and a new html.

## Modules
| # | module | output | fixed/optional | filled by | length |
|---|---|---|---|---|---|
| 1 | subject | email | fixed | writer | ≤ 50 chars. A and B. Names the best thing. |
| 2 | preheader | email | fixed | writer | ≤ 80 chars. The second-best thing. Not relied on. |
| 3 | header | email | fixed | fixed | logo strip |
| 4 | wallet | email | fixed | fixed | One Wallet ID · Phone Dollars (merge) |
| 5 | salutation | email | fixed | fixed | Kia ora [FirstName], |
| 6 | headline | email | fixed | writer | 2 lines. Counts toward the 250. |
| 7 | intro-copy | email | fixed | writer | headline + copy ≤ 250 chars. The thread. |
| 8 | hero | email | fixed | client | image, see IMAGES below |
| 9 | card ×N | email | 3–5 | — | repeating, one per story in the lineup. Type: prize / news / product / housekeeping. Order from brief. |
| 9a | card-title | email | fixed | writer | ≤ 48 chars. Prize cards say the prize. |
| 9b | card-body | email | fixed | writer | ≤ 160 chars. |
| 9c | card-cta | email | optional | writer picks | ≤ 24 chars, from the set. Secondary style. |
| 9d | card-image | email | fixed | client | image, see IMAGES below |
| 10 | signoff-copy | email | fixed | writer | ≤ 250 chars. One plain sentence about the next thing. The Ngā mihi lines are the html's, not the writer's. |
| 11 | banner | email | optional | fixed | Best in Test. Client toggles. |
| 12 | legals | email | fixed | assembled | config.md — per-card draw clauses, extras, standard |
| 13 | base | email | fixed | fixed | privacy · copyright |

## Card count
Min 3, max 5. Guidelines cap imagery at 40% of the email; five cards plus a hero is about the ceiling. Fewer than three and it isn't a roundup.

## Why-beat fallbacks (FIX IT rail, per module)
- subject: The front page. Best thing, then the second best. No teasing.
- headline: Plain inventory of the issue, two lines.
- intro-copy: The thread — one idea that hangs the cards together, told dry.
- card-title: Says what it is. Prize cards say the prize.
- card-body: 160 characters. What, why you'd care, what to do.
- signoff-copy: One sentence about the next thing. No cheer.
- legals: Suze's clauses, assembled from the brief. Read it and nod.

## Notes
- Titles sentence case, no full stop. "Be in to WIN" in Q1 is wrong.
- One exclamation mark per email at most, and it lives in the intro if it lives anywhere.
- Prize cards fire a draw clause each (config.md). Needs a short prize name and a close date per card.
- Q1 broke most of the lengths. The container html has them truncated to show the cut.

## VOICE LEAN
*Appended to the brand voice on every WRITER and FIXER call. Where this format bends the voice, and no more. Brand stays in brands/one_nz/voice.md.*

- **Register:** roundup-newsy, not single-prize-excited. A mate catching you up on a few things, in order. Warmest in the intro; flattest in the base.
- **Where the voice bends for the shape:**
  - *Subject/preheader:* the front page. Name the best thing and the second best. No teasing.
  - *Headline:* two lines max, plain inventory of the issue. "Be in to win. Plus, more to explore." is the right shape.
  - *Intro:* the thread. One idea that hangs the cards together, told dry. This is where the one exclamation mark may live, if anywhere.
  - *Card, prize:* the prize in the title. Body: what it is, how you're in. Never a value unless the brief locks one.
  - *Card, news:* the interesting bit first, the partnership second. No "we're thrilled".
  - *Card, product:* the benefit, not the announcement. "Ready for round two, with you." is the bar.
  - *Card, housekeeping:* one line, do the thing. No cheerleading a balance check.
  - *Sign-off:* one plain sentence about the next thing. No cheer.
- **Buttons:** from the fixed set only: Enter now · Find out more · Learn more · Check my balance. Writer picks, never invents.
- **Rhythm:** not staccato. Short sentences are the seasoning, not the meal. Each block gets at least one sentence that runs on a bit, the way a person does when they're actually telling you something.

## RULES
### FIXER never touches
- Base: legals, privacy, copyright (assembled, not written)
- Header and wallet strip (merge fields)
- Salutation "Kia ora [FirstName],"
- "Ngā mihi / Your team at One New Zealand" (fixed string, pending One NZ)
- Best in Test banner
- Button labels — from the fixed set only
- Card order and card count — set in FEED IT, not FIX IT

### Deflects with a modal (terms-fed)
- Close dates, wherever they appear — "That's from the brief. Change it in FEED IT and I'll rewrite around it."
- Prize names, prize counts, prize values
- Dollar figures and percentages quoted from the dump ($180,000, 24-month warranty)
- Product names and model numbers (Sony WH-1000XM6)
- Partner names (DOC, Fieldays)

### WRITER never invents
- Dates, prices, values, counts, warranties
- Product names, model numbers, partner names, place names
- A card that isn't in the brief — five cards briefed means five cards written
- A card type — prize / news / product / housekeeping comes from the brief
- Button labels outside the set: Enter now · Find out more · Learn more · Check my balance
- Links — every button and copy link gets its URL from needs, or stays "#"
- Anything about the network, coverage or plans not in the dump

### Hard limits (engine enforces, writer obeys)
subject 50 · preheader 80 · intro block 250 · card title 48 · card body 160 · button 24 · sign-off 250. Over is a bounce, not a trim.

## IMAGES
| output | slot | size (px) | ratio | notes |
|---|---|---|---|---|
| email | hero | 1200 × 680 | 16:9 | full-bleed under the intro, 600 wide at 1x. Confirm with One NZ. |
| email | card-image (×N) | 940 × 500 | ~1.9:1 | 470 wide at 1x, 250 tall, top-right corner cropped 40px by the card. One per card. |
| email | banner | ? | ? | Best in Test, fixed asset from One NZ. |

Static jpeg < 300KB. GIF < 1MB, end frame first. Total imagery ≤ 40% of the email.
