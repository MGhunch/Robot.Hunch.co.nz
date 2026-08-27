# ROBOT v009 — the canon release
*28 August 2026 — built on the GitHub main zip. The site plan went to v2
(workers are the engine; a container is voice + specs) and this release
makes the code say the same thing.*

## The prompts restructured (/prompts)
Workers flat, engine-only. Containers are voice + specs.
- prompts/writer.md    — the task card, from write_it/prize_draw.md;
  format numbers now defer to the specs
- prompts/fixer.md     — from tweak_it.md; the surgeon metaphor is gone,
  the doctrine (smallest change that honours the note) is not
- prompts/feeder.md    — reserved slot, canon wording
- prompts/extract.md   — unchanged (tool)
- prompts/containers/prize_draw/voice.md — the One NZ voice, moved from
  spine.md. It was the container's voice wearing the engine's clothes.
- prompts/containers/prize_draw/specs.md — NEW: the shape (subject/
  headline/body lengths) and the placeholder rule, split out of spine
  and the writer card

## The drift fix
Specs now travel with BOTH writing calls. The fixer previously never saw
word lengths — a tweak could burst a block and nothing would say so.
Voice + specs + worker card is now the assembly for writer and fixer
alike: same voice, same shape, both ends.

## Fail loud
The embedded prompt fallbacks are deleted (~120 lines). A missing prompt
file now raises with its path instead of quietly serving a stale voice.
Hot reload stays.

## Deletions
- Legacy mirrors in /api/tweak (message/proposal/pushback) — grace over
- robot-v007.zip, "Robot.Hunch.co.nz-main (3).zip" — archaeology out of
  the repo
- robot_store.jsonl — the store is runtime data, not source

## Renames in prose
surgeon → fixer in copy_stage.py docstrings and index.html comments.

## Unchanged, deliberately
terms.py, auth.py, the front end (comments aside), voice_examples.json.
The clause library and form stay hardcoded — that's the container
abstraction (hit list 17), not this pass. The Prompter port for SET UP
and the fixer's two-options behaviour are hit list v4 items.

*Honest.*
