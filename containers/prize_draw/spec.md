# SPEC — prize_draw
*What's built. Outputs, modules and lengths, why-beats, the voice lean, the engine's rules, the image sizes. One home for every number. The skin is the brand's (brands/one_nz/skin.md).*

## Outputs (primary first)
| id | name | files emitted |
|---|---|---|
| email | Rewards prize-draw email | copy doc, sign-off PDF, hero image |

A webtile sits as a dead tab in FIX IT. Second output when someone asks for one.

## Modules
| # | module | output | fixed/optional | filled by | length |
|---|---|---|---|---|---|
| 1 | subject | email | fixed | writer | ≤ 45 chars. Three options, genuinely different; best one on the card, two in the drawer. |
| 2 | header | email | fixed | fixed | From: One NZ Rewards <rewards@one.nz> |
| 3 | hero | email | fixed | client | image, see IMAGES below |
| 4 | headline | email | fixed | writer | One line. Plain about what you win. |
| 5 | body | email | fixed | writer | Two or three short sentences, ending with what to do. |
| 6 | button | email | fixed | fixed | Enter now |
| 7 | terms | email | fixed | assembled | config.md — base clauses, prize-type extras, ticked options |
| 8 | footer | email | fixed | fixed | Rewards contact line, config.md |

## The placeholder rule
The writer never writes a number or a date as a literal. Only these, in curly braces, spelled exactly:
`{prize_name} {winners} {winners_word} {winner_word} {closes_day} {closes_short} {closes_long} {opens_short} {venue} {event_date_short}`
"one of {winners_word} double passes", never "one of five". "closes {closes_day}", never "closes Sunday". A bare digit or a written-out month is a bounce. The engine fills them from the same facts that built the terms — one source of truth, two renderings.

## Why-beat fallbacks (FIX IT rail, per module)
- subject: The pick of three — two more wait in the drawer.
- headline: Plain about what you win — the rule up here.
- body: The story, three short lines, ends with what to do.
- terms: Suze's clauses, assembled from the brief. Read it and nod.

## Notes
- A piece that bursts its block is wrong, however good the words.
- The subject can be playful. The headline can't.

## VOICE LEAN
*Appended to the brand voice on every WRITER and FIXER call. Where this format bends the voice, and no more. Brand stays in brands/one_nz/voice.md.*

- **Register:** one prize, one night out. An enthusiast. Dig for what's genuinely cool about this show, band or movie and serve it up snappy and interesting.
- **The hook:** always the human one. What the reader gets to do, feel, or tell their mates about, not what the product is.
- **Subject:** where the charm lives. Three options, genuinely different in approach, not three rewordings of one idea.
- **Headline:** plain about what you win. Clarity beats cleverness there, every time.
- **Body:** two or three short sentences, ending with what to do. The button is the sign-off; there isn't one.
- **Too thin to write:** say so in "wants", one short line naming what would help. Don't fake enthusiasm you can't source.
- **Facts:** travel as placeholders, never literals. The list is above.

## RULES
### FIXER never touches
- Terms — assembled from the brief, never written. On the terms block the FIXER only locks or declines.
- Footer (Rewards contact line)
- From line and button label ("Enter now")
- The placeholders themselves — a tweak keeps every {slot} where it was

### Deflects with a modal (terms-fed)
- Open, close and draw dates, wherever they appear — "That's from the brief. Change it in FEED IT and I'll rewrite around it."
- The prize name, the number of winners
- Venue and event date
- Anything the terms say

### WRITER never invents
- A number or a date as a literal — placeholders only (spec.md)
- A venue, a date, a count, a value not in the brief
- A prize type — movie / gig / sport / other comes from the brief
- Cast lists and director credits — that's the studio's writing

### Hard limits (engine enforces, writer obeys)
subject 45 · headline one line · body three sentences. Over is a bounce, not a trim.

### The check (code half, runs before Suze sees copy)
- Any {placeholder} not on the allowed list — flag.
- Any bare number in the copy — flag.
- Any month written out — flag.

## IMAGES
| output | slot | size (px) | ratio | notes |
|---|---|---|---|---|
| email | hero | ? | ? | One image, under the subject, above the headline. FIX IT shows "Hero image goes here". No size confirmed with One NZ — hit list 20. |

Uploads land during THINKING via the pics page; nothing is cropped yet (hit list 6).
