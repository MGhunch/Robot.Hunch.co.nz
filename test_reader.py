"""Smoke test for the reader: both shipped folders read clean, a broken
folder bounces with every reason at once. Run: python3 test_reader.py"""
import os, shutil, tempfile, containers as C

cs = C.containers()
assert set(cs) >= {"one_update", "prize_draw"}, cs.keys()
for cid, c in cs.items():
    assert not c["problems"], (cid, c["problems"])
    assert c["brand_data"]["voice"], cid
    assert len(c["feed_it"]["moves"]) == 3, cid
    assert c["needs"]["groups"] and c["spec"]["modules"], cid
    assert C.voice_for(c).count("Container") <= 1
assert cs["prize_draw"]["legals"]["by_type"][1]["needs"] == ["venue", "event_date"]
assert cs["one_update"]["needs"]["groups"][0]["repeat"] == {"per": "story", "min": 3, "max": 5, "where": None}
assert cs["one_update"]["needs"]["groups"][0]["rows"][2]["type"] == "topics"
assert cs["one_update"]["spec"]["modules"][0]["max_chars"] == 50
assert cs["one_update"]["brand_data"]["skin"]["tokens"]["green"] == "#1B7C53"
print("both folders read clean")

# a deliberately broken container: wrong brand, no spec, a clause with an
# orphan placeholder, a duplicate id, a fourth move
tmp = tempfile.mkdtemp()
broken = os.path.join(tmp, "broken")
shutil.copytree(os.path.join(C.CONTAINERS_DIR, "prize_draw"), broken)
os.remove(os.path.join(broken, "spec.md"))
os.rename(os.path.join(broken, "prize_draw.html"), os.path.join(broken, "broken.html"))
cfg = open(os.path.join(broken, "config.md"), encoding="utf-8").read()


def break_it(text, old, new):
    """Plant one fault. A substitution that matches nothing means config.md
    has moved on and this fixture is stale — say so here, where it's obvious,
    rather than letting the assert below fail for a reason that isn't true."""
    if old not in text:
        raise AssertionError(f"fixture is stale: config.md no longer contains {old!r}")
    return text.replace(old, new)


cfg = break_it(cfg, "brand:   one_nz", "brand:   sky")
cfg = break_it(cfg, "| winners | Prizes |", "| prize_name | Prizes |")
cfg = break_it(cfg, "{opens_long} at {opens_time}", "{opens_long} at {kickoff}")
cfg = break_it(cfg, "| 3 | the angle |", "| 4 | encore | Again? | | |\n| 3 | the angle |")
open(os.path.join(broken, "config.md"), "w", encoding="utf-8").write(cfg)
reasons = C.validate(broken)
print("\n".join("  ! " + r for r in reasons))
want = ["spec.md is missing", "brand 'sky'", "'prize_name' appears more than once", "{kickoff}", "three moves"]
for w in want:
    assert any(w in r for r in reasons), (w, reasons)
assert len(reasons) >= 5
shutil.rmtree(tmp)
print("broken folder bounced with", len(reasons), "reasons")
