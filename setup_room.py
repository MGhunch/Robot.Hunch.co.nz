"""
ROBOT — THE SET UP ROOM
=======================
The upload door. SET UP builds a container somewhere else and hands back
two folders; this takes the zip of them, lays them out in a scratch dir,
and lets the reader answer its usual question about them.

Nothing here writes to brands/ or containers/. The live folders are the
ones that have landed; a dropped folder is a thing being looked at, and it
lives in scratch until the next one replaces it. That is the whole safety
story: the worst a bad zip can do is fail to render.

Codes, not sentences. The words live in static/js/strings.js under
STR.setup, the same way the reader's dead-doc lines do.

    nozip       nothing arrived
    broken      not a zip, or it won't open
    fat         too many files, or one of them is silly big
    nocontainer no folder in it holds config.md and spec.md
    nobrand     the container names a brand the zip doesn't carry
"""

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


def take(stream, sid):
    """Unpack a dropped zip into this session's scratch and lay it out the
    way the reader expects: <scratch>/brands/<id> and
    <scratch>/containers/<id>. Returns (root, container ids, brand ids).
    Raises DropError with a code."""
    if stream is None:
        raise DropError("nozip")
    root = os.path.join(SCRATCH, re.sub(r"[^A-Za-z0-9_-]", "", sid) or "anon")
    shutil.rmtree(root, ignore_errors=True)                 # one drop at a time
    raw = os.path.join(root, "_raw")
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
    if not cdirs:
        raise DropError("nocontainer")
    bdirs = _dirs_holding(raw, "brand.md")

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
    if not cids:
        raise DropError("nocontainer")
    return root, cids, bids


def asset_url(root, path):
    """A brand asset in the scratch, served back through the check door."""
    return "/api/setup/asset/" + path.lstrip("/")


def clear(sid):
    shutil.rmtree(os.path.join(SCRATCH, re.sub(r"[^A-Za-z0-9_-]", "", sid) or "anon"),
                  ignore_errors=True)
