"""Engine smoke: facts, clauses and the API, no model key needed.
Run: python3 test_engine.py  (after test_reader.py)"""
import os
os.environ.setdefault("ROBOT_WORDS", "taniwha:Michael")
import containers as C, engine as E
from app import app

c = C.container("prize_draw")
form = {"prize_type": "movie", "prize_name": "Practical Magic 2", "winners": "5",
        "opens": "2026-08-24", "closes": "2026-09-06"}
f = E.build_facts(c, form)
assert f["drawn_long"] == "Monday 7 September 2026" and f["plural"] and f["winners_word"] == "five"
terms = E.render_terms(c, f)
assert terms.startswith("• All One New Zealand customers") and "One (1) double pass to see Practical Magic 2" in terms
assert "Winners must comply" in terms and "The winners will be contacted" in terms
assert [m["id"] for m in E.clause_menu(c, f)][:4] == ["eligibility", "entry", "winners", "prize_line"]
for bad, msg in [(dict(form, closes="2026-08-01"), "before"), (dict(form, prize_type="gig"), "needs"),
                 (dict(form, prize_type="Spa"), "don't know"), (dict(form, winners="0"), "at least")]:
    try:
        E.build_facts(c, bad); raise AssertionError(bad)
    except E.TermsError as e:
        assert msg in str(e), (msg, e)
assert E.check_copy(c, "Win 5 passes in September", f)
assert not E.check_copy(c, "Win {winners_word} passes {closes_day}", f, "subject")
assert E.render_copy(c, "by {closes_day}", f) == "by Sunday"

ou = C.container("one_update")
f2 = E.build_facts(ou, {"issue": "Q3", "card_count": "3", "card": [
    {"card_type": "prize", "card_subject": "Headphones", "prize_name": "Sony", "prize_count": "1", "closes": "2026-09-06"},
    {"card_type": "news", "card_subject": "Toilets"}, {"card_type": "product", "card_subject": "Refurb"}]})
assert f2["card"][0]["closes_day"] == "Sunday" and f2["card"][0]["closes_time"] == "11:59pm" and "closes_day" not in f2["card"][1]
assert E.check_copy(ou, "x" * 170, f2, "card-body")
print("engine ok")

t = app.test_client()
assert t.get("/api/containers").status_code == 401
t.post("/api/auth/word", json={"word": "unicorn", "name": "Suze"})
assert [x["id"] for x in t.get("/api/containers").get_json()["tiles"]] == ["prize_draw"]
assert t.get("/api/container/one_update").status_code == 404
t.post("/api/auth/word", json={"word": "taniwha"})
d = t.get("/api/containers").get_json()
assert d["hunch"] and {x["id"] for x in d["tiles"]} == {"one_update", "prize_draw"}
d = t.get("/api/container/one_update").get_json()
assert d["quiz"]["moves"][0]["key"] == "gap" and d["checklist"]["groups"][1]["repeat"]["min"] == 3
assert "/brands/one_nz/assets/" in d["html"] and d["ghost"][0] == "precopy"
r = t.post("/api/terms", json={"container": "prize_draw", "form": form}).get_json()
assert len(r["menu"]) == 15 and r["footer"].startswith("For any queries")
r = t.post("/api/parcel", json={"container": "prize_draw", "form": form,
                                "copy": {"subject": "Win {winners_word} by {closes_day}", "headline": "h", "body": "b"}}).get_json()
assert r["copy"]["subject"] == "Win five by Sunday" and r["slug"] == "practical-magic-2" and r["clause_count"] == 12
assert t.post("/api/feeder", json={"container": "one_update", "next": 2}).get_json()["enrich"] == "Why will anyone care?"
assert t.post("/api/copy", json={"container": "nope"}).status_code == 404
assert t.get("/").status_code == 200
print("api ok")
