# CHANGES — v012
*30 August 2026*

## THE QUIZ (hit list 2) — FEED IT's front door rebuilt

The story page becomes the three question quiz: robot-led chat on the
Wrangler split, the artefact's ghost on the left of the table, one
journey, three stops. Designed in feed-it-ghost-mock.html — the mock is
the spec.

### The container learns to deal the quiz
- `prompts/containers/prize_draw/quiz.json` — NEW. The quiz block of the
  container definition: artefact name, pill, tagline, the three fixed
  questions (title, patter, placeholder, why-beat), tool flags, closing
  line, and the SHAPE block the ghost renders from. Hand-authored now;
  shaped as SET UP's (22) future output. The shape block is job 20's
  first structured appearance — FIX IT's render and FINISHED's files
  should eventually read the same block.
- `/api/quiz` — serves the config, auth-gated, comment keys stripped.
  Fresh-read on file change, same rule as prompts. Missing file fails
  loud.

### The FEEDER goes live (rail fixed, dressing live)
- `prompts/feeder.md` — the reserved stub becomes the real prompt: play
  back what was heard, tailor the next fixed question to the payload.
  Never invents or reorders questions; never asks for checklist facts.
- `/api/feeder` — one small model call between questions. On ANY stumble
  (no key, model error, unreadable reply) it returns the config's
  standing patter with `live:false` — the robot asks the plain version
  in character and the front end can't tell. One failure surface.

### The front end
- storyView replaced by the quiz stage: full-bleed red (FIX IT's
  margin-trick), ghost left / conversation right, pill zones, scrolling
  chat with top fade, paper bubbles for the human (red talks, paper
  works), tool circles at send height with keyline above.
- Answers land in hidden storyPrize / blurb / storyCare slots — 
  extraction, craftKey, the checklist, and THINKING read exactly what
  they always read.
- Tools: upload reads text files into the box (non-text gets an honest
  in-character line); the ? answers the why-beat in the chat from
  config; LET IT DIG is config-flagged OFF until SEARCH (9) exists —
  the circle doesn't render. That closes the carried question: feature
  flag, not honest refusal.
- toDetail() guarded for the departed button; the quiz drives it after
  question three.

### Open
- Quiz copy (patter, placeholders, why-beats, closing) is roughed —
  Michael to dictate final words into quiz.json.
- Ghost wake-up (stepping forward as answers land) designed in
  conversation, not yet built.
- FEEDER uses the main model; a faster model for patter is a one-line
  env change if latency niggles.
