"""
ROBOT — THE SET UP ROOM
=======================
The upload door. SET UP builds a container somewhere else and hands back
two folders; this takes the zip of them, lays them out in a scratch dir,
and lets the reader answer its usual question about them.

Nothing here writes to brands/ or containers/. The live folders are the
ones that have landed; a dropped folder is a thing being looked at, and it
lives in scratch until it is dropped again or cleared. That is the whole
safety story: the worst a bad zip can do is fail to render.

Codes, not sentences. The words live in static/js/strings.js under
STR.setup, the same way the reader's dead-doc lines do.

    nozip       nothing arrived
    broken      not a zip, or it won't open
    fat         too many files, or one of them is silly big
    nofolders   nothing in it looks like a brand or a container

SET UP hands its two folders back separately — a brand once per client, a
container per format — so a drop is not always both. The scratch holds what
it has been given and the room says what it is still waiting for; dropping
the same folder id again replaces it. Nothing here decides whether what it
holds is enough; the reader does that, out loud.
"""

import glob
import os
import re
import shutil
import zipfile

# Scratch lives outside the repo on purpose: nothing dropped here can be
# mistaken for something that landed. Railway gives us /tmp; the volume is
# for things that are meant to survive, and a folder being checked isn't.
SCRATCH = os.environ.get("ROBOT_SETUP_SCRATCH", "/tmp/robot-setup")

MAX_FILES = 400
MAX_ONE = 8 * 1024 * 1024          # one file, uncompressed
MAX_ALL = 40 * 1024 * 1024         # the lot, uncompressed
SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


class DropError(Exception):
    """Carries the code the front end turns into words."""


def _safe_members(zf):
    """Every entry, checked. A zip is a stranger: absolute paths, .. and
    symlinks are how one walks out of the folder it was given."""
    total = 0
    out = []
    for i in zf.infolist():
        name = i.filename
        if i.is_dir():
            continue
        if name.startswith(("/", "\\")) or ".." in name.replace("\\", "/").split("/"):
            raise DropError("broken")
        if (i.external_attr >> 16) & 0o170000 == 0o120000:      # symlink
            raise DropError("broken")
        if any(part in ("__MACOSX",) or part.startswith("._") for part in name.split("/")):
            continue
        if i.file_size > MAX_ONE:
            raise DropError("fat")
        total += i.file_size
        if total > MAX_ALL or len(out) >= MAX_FILES:
            raise DropError("fat")
        out.append(i)
    if not out:
        raise DropError("broken")
    return out


def _dirs_holding(root, *names):
    """Folders in the tree that hold all of these files. The zip can be
    shaped however SET UP zipped it — folders at the root, or a wrapper
    folder around them, or the whole repo shape. We look, rather than
    insisting."""
    found = []
    for here, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if not d.startswith((".", "__"))]
        if all(n in files for n in names):
            found.append(here)
    return sorted(found)


def _root(sid):
    return os.path.join(SCRATCH, re.sub(r"[^A-Za-z0-9_-]", "", sid) or "anon")


def held(sid):
    """What this session has been given so far."""
    root = _root(sid)
    return (root,
            [os.path.basename(p) for p in sorted(glob.glob(os.path.join(root, "containers", "*")))
             if os.path.isdir(p)],
            [os.path.basename(p) for p in sorted(glob.glob(os.path.join(root, "brands", "*")))
             if os.path.isdir(p)])


def take(stream, sid):
    """Unpack a dropped zip into this session's scratch and lay it out the
    way the reader expects: <scratch>/brands/<id> and
    <scratch>/containers/<id>. Adds to what's already there — a brand can
    arrive on Monday and its container on Tuesday, and dropping a folder
    again replaces that one and nothing else. Returns (root, container ids,
    brand ids) for everything held, not just this drop. Raises DropError
    with a code."""
    if stream is None:
        raise DropError("nozip")
    root = _root(sid)
    raw = os.path.join(root, "_raw")
    shutil.rmtree(raw, ignore_errors=True)                  # this drop's unpacking only
    os.makedirs(raw, exist_ok=True)
    try:
        with zipfile.ZipFile(stream) as zf:
            for i in _safe_members(zf):
                zf.extract(i, raw)
    except DropError:
        raise
    except Exception:
        raise DropError("broken")

    cdirs = _dirs_holding(raw, "config.md", "spec.md")
    bdirs = _dirs_holding(raw, "brand.md")
    if not cdirs and not bdirs:
        raise DropError("nofolders")

    bases = os.path.join(root, "brands")
    cases = os.path.join(root, "containers")
    os.makedirs(bases, exist_ok=True)
    os.makedirs(cases, exist_ok=True)
    cids, bids = [], []
    for d in cdirs:
        cid = os.path.basename(d.rstrip("/"))
        if not SAFE_NAME.match(cid):
            continue
        shutil.copytree(d, os.path.join(cases, cid), dirs_exist_ok=True)
        cids.append(cid)
    for d in bdirs:
        bid = os.path.basename(d.rstrip("/"))
        if not SAFE_NAME.match(bid):
            continue
        shutil.copytree(d, os.path.join(bases, bid), dirs_exist_ok=True)
        bids.append(bid)
    if not cids and not bids:
        raise DropError("nofolders")
    shutil.rmtree(raw, ignore_errors=True)                  # the unpacking was scaffolding
    return held(sid)


def clear(sid):
    """Start again. The only way anything leaves the scratch."""
    shutil.rmtree(_root(sid), ignore_errors=True)
