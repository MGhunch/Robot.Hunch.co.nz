# CHANGES — v045
*4 September 2026 — PUSH. A draft goes into git as one ordinary commit, and
that is what makes it live.*

## Files

**New**
- `setup_push.py` — the push lane.
- `changelog/CHANGES-v045.md` — this.

**Replaced**
- `app.py` — the push route and its two gates.
- `static/js/setup.js` — the button does something now. Tag `v=045`.
- `static/js/strings.js` — what the lane can say back. Tag `v=045`.
- `static/index.html` — the tags. **`robot.css?v=045`**.

**Delete by hand** — nothing.

## Files, not a zip

A zip in git is one opaque blob: no diff, no line-level revert, no answer
to "what changed on Tuesday". Writing the files costs the same API call and
gives a real history — which is the entire reason the source lives in git
and not on the volume.

## One commit

Blobs, then a tree hung off the current one, then a commit, then the branch
moves. If anything fails before that last step nothing has happened: the
loose objects are unreferenced and GitHub collects them. **Half a folder
never lands.** The message is `<id>: the brand folder, from SET UP`, so
`git log` reads like the folder's own history.

Deletions travel too. A file you pruned from the draft is removed from the
tree rather than left behind — which is why the allowlist below matters: a
delete is a write.

## What it may touch, enforced rather than trusted

    brands/<id>/...        the folder being pushed, and only that one
    containers/<id>/...

Every path is checked against the folder being pushed before a single blob
is posted. **The app cannot write engine code** — not by accident, not via
a folder id that tries something clever. Tested with `static/hunch`,
`brands/../../app` and `brands/hunch/../..`: all three refused.

## Two gates in front of the lane

**It has to be a draft.** Pushing what's already in git is a no-op with a
commit attached.

**It has to read clean.** The validator runs again server-side — the
button's own check is a request, not a permission.

And one that saves a confusing bounce: **a container can't go live ahead of
its brand.** If its brand is still a draft, the validator would refuse it
with *"brand X has no folder under brands/"*, which is true and unhelpful.
It now says *"Push the X brand first — a container can't go live pointing
at a brand no client can see."*

## The token

A fine-grained personal access token: one repository, **Contents: read and
write**, nothing else. It sits in Railway as `GITHUB_TOKEN`. Override the
repo or branch with `GITHUB_REPO` / `GITHUB_BRANCH` if either ever moves.

**No token means the button isn't offered** and the download carries on as
it always has. Nothing breaks by not setting one.

## Verified
- The commit builder against a stub GitHub: 12 blobs, one tree hung off the
  current one, one commit parented on HEAD, the ref moved exactly once and
  last. A pruned file arrives as a deletion. The compiled cache never
  travels. No zip anywhere.
- The allowlist refused all three escape attempts.
- The gates, at the route: an unclean brand (400, and the problem named), a
  container whose brand hasn't landed (400, brandfirst), something that
  isn't a draft, and a bad kind. **GitHub was never called for any of them**
  — the lane was stubbed to throw if it was.
- The failure path, by accident and for real: the build sandbox turned out
  to carry its own GitHub token, so the button made a genuine call to the
  API and got a clean 403 at the first read. Nothing was written — the
  refusal comes before any blob is posted — and the room said *"The token
  can't write to that repo. It wants Contents: read and write."* Which is
  exactly the sentence you'd want if the token were ever wrong.
- `smoke_gates.sh` PASS · `smoke_errors.js` **22 views, 0 differing** (the
  v044 arrow artefact didn't recur, which settles what it was) ·
  `smoke_ui.js` `errors: []` · `test_reader.py` clean · six FEED IT and
  doorway renders pixel-identical to the committed baseline.

## The first real push is yours
It couldn't be tested from here — the token is in Railway, which is where
it belongs. Expect: PUSH goes live only when the folder is a draft, every
stop is shut and the validator is happy; then a commit in your history, and
Railway redeploying for about a minute before it's actually live. If
anything's wrong it says which thing, in words, and nothing moves.

*Honest.*
