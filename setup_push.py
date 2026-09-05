"""
ROBOT — PUSHING A DRAFT INTO GIT
================================
A draft lives on the volume. Pushing it writes the files into the repo as
one ordinary commit, and that — nothing else — makes it live.

FILES, NOT A ZIP. A zip in git is one opaque blob: no diff, no line-level
revert, no answer to "what changed on Tuesday". Writing the files costs the
same API call and gives a real history, which is the entire reason the
source lives in git rather than on the volume.

ONE COMMIT. Blobs, then a tree hung off the current one, then a commit,
then the branch moves. If anything fails before the last step, nothing has
happened — the loose objects are unreferenced and GitHub collects them.
Half a folder never lands.

WHAT IT MAY TOUCH, and this is enforced here rather than trusted:

    brands/<id>/...        the folder being pushed, and only that one
    containers/<id>/...

No other path is ever written, so the app cannot change engine code by
accident or by a folder id that tries something clever. Deletions are
handled too: a file pruned from the draft is removed from the tree, which
is why the allowlist matters — a delete is a write.

The token is a fine-grained personal access token, one repo, Contents:
read and write. Without one, push isn't offered at all.
"""

import base64
import os
import re

import requests

TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
REPO = os.environ.get("GITHUB_REPO", "MGhunch/Robot.Hunch.co.nz").strip()
BRANCH = os.environ.get("GITHUB_BRANCH", "main").strip()
API = "https://api.github.com"
SAFE_ID = re.compile(r"^[A-Za-z0-9._-]+$")
KINDS = ("brands", "containers")
TIMEOUT = 30


class PushError(Exception):
    """Carries the code the front end turns into words."""


def ready():
    """Is there anywhere to push to? The button asks before it offers."""
    return bool(TOKEN and REPO)


def _h():
    return {"Authorization": "Bearer " + TOKEN,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"}


def _get(path):
    r = requests.get(API + path, headers=_h(), timeout=TIMEOUT)
    if r.status_code == 401:
        raise PushError("badtoken")
    if r.status_code == 403:
        raise PushError("noperm")
    if r.status_code == 404:
        raise PushError("norepo")
    if not r.ok:
        raise PushError("github")
    return r.json()


def _post(path, body, patch=False):
    fn = requests.patch if patch else requests.post
    r = fn(API + path, headers=_h(), json=body, timeout=TIMEOUT)
    if r.status_code == 401:
        raise PushError("badtoken")
    if r.status_code in (403, 422) and "protected" in (r.text or "").lower():
        raise PushError("protected")
    if r.status_code == 403:
        raise PushError("noperm")
    if not r.ok:
        raise PushError("github")
    return r.json()


def _walk(folder, prefix):
    """Every file in the draft, as (path-in-repo, bytes). The compiled cache
    is the engine's litter — it rebuilds itself and is gitignored — so it
    never travels."""
    out = {}
    for here, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if not d.startswith((".", "_"))]
        for f in sorted(files):
            if f.endswith(".compiled.json") or f == ".DS_Store":
                continue
            full = os.path.join(here, f)
            rel = os.path.relpath(full, folder).replace(os.sep, "/")
            with open(full, "rb") as fh:
                out[prefix + "/" + rel] = fh.read()
    return out


def _landed(prefix):
    """What's in git under this folder right now, so a file the draft no
    longer has can be deleted rather than left behind."""
    try:
        tree = _get(f"/repos/{REPO}/git/trees/{BRANCH}?recursive=1")
    except PushError:
        return set()
    return {t["path"] for t in tree.get("tree", [])
            if t.get("type") == "blob" and t["path"].startswith(prefix + "/")}


def push(kind, fid, folder, message):
    """One commit. Returns the commit's sha and what it did."""
    if not ready():
        raise PushError("nopush")
    if kind not in KINDS or not SAFE_ID.match(fid or ""):
        raise PushError("gone")
    prefix = f"{kind}/{fid}"

    files = _walk(folder, prefix)
    if not files:
        raise PushError("empty")

    # THE ALLOWLIST. Nothing above may have produced a path outside the
    # folder being pushed, but this is the line that makes that true rather
    # than likely — it is the only thing between a folder id and the code.
    for p in files:
        if not p.startswith(prefix + "/") or ".." in p.split("/"):
            raise PushError("outside")

    gone = _landed(prefix) - set(files)

    ref = _get(f"/repos/{REPO}/git/ref/heads/{BRANCH}")
    head = ref["object"]["sha"]
    base_tree = _get(f"/repos/{REPO}/git/commits/{head}")["tree"]["sha"]

    entries = []
    for path, raw in sorted(files.items()):
        blob = _post(f"/repos/{REPO}/git/blobs",
                     {"content": base64.b64encode(raw).decode(), "encoding": "base64"})
        entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    for path in sorted(gone):
        entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})

    tree = _post(f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": entries})
    commit = _post(f"/repos/{REPO}/git/commits",
                   {"message": message, "tree": tree["sha"], "parents": [head]})
    _post(f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": commit["sha"]}, patch=True)
    return {"sha": commit["sha"][:7], "wrote": len(files), "removed": len(gone),
            "url": f"https://github.com/{REPO}/commit/{commit['sha']}"}
