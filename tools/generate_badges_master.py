#!/usr/bin/env python3
import json
import re
from pathlib import Path
import yaml

BADGES_DIR = Path("_badges")
OUT_ADMIN = Path("admin/badges_master.json")
OUT_DATA = Path("_data/badges_master.json")

ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

def load_badge(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    _, fm, body = text.split("---", 2)
    data = yaml.safe_load(fm) or {}
    data["_body"] = body.strip()
    return data

def extract_requirements(badge):
    reqs = []

    if isinstance(badge.get("requirements"), list):
        for r in badge["requirements"]:
            no = str(r.get("no") or r.get("id") or "").strip()
            txt = str(r.get("text") or "").strip()
            if no and txt:
                reqs.append({"no": no, "text": txt})

    if not reqs and badge.get("_body"):
        for m in re.finditer(r"^\s*(\d+)[\.\)]\s+(.*)$", badge["_body"], re.M):
            reqs.append({"no": m.group(1), "text": m.group(2).strip()})

    if not reqs and False in badge:
        raw = badge[False]
        if isinstance(raw, list):
            for i, txt in enumerate(raw, start=1):
                reqs.append({"no": str(i), "text": str(txt).strip()})

    return reqs

def main():
    output = []

    for md in sorted(BADGES_DIR.rglob("*.md")):
        badge = load_badge(md)
        if not badge:
            continue
        if badge.get("keep") == "no":
            continue

        badge_id = badge.get("id")
        if not badge_id or not ID_PATTERN.match(badge_id):
            raise RuntimeError(f"Invalid badge id in {md}: {badge_id}")

        title = badge.get("title", badge_id)
        section = badge.get("section", "")
        category = badge.get("category", "")

        output.append({
            "kind": "badge",
            "badge_id": badge_id,
            "title": title,
            "section": section,
            "category": category,
            "icon": f"/assets/images/badges/{badge_id}.png",
        })

        reqs = extract_requirements(badge)
        if not reqs:
            reqs = [{"no": "1", "text": "Complete the requirements for this badge."}]

        for r in reqs:
            output.append({
                "kind": "req",
                "badge_id": badge_id,
                "req_no": r["no"],
                "text": r["text"],
            })

    OUT_ADMIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_ADMIN.write_text(json.dumps(output, indent=2), encoding="utf-8")
    OUT_DATA.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(f"Generated {len(output)} rows")

if __name__ == "__main__":
    main()
