#!/usr/bin/env python3
"""Regenerate `assets/data/stem_badge_map.json` from `_data/badges_master.json`.

The STEM map is a curated subset of all badge requirements.

We regenerate it to:
- keep requirement refs stable + unique (e.g. "Meteorology 1", "Mechanic 1")
- avoid duplicated numbers in the UI
- preserve previously written STEM judgements when requirement text matches

Matching rule
- We match by (badge_id, requirement text). If an older map entry matches a
  new requirement text, we carry over: strength, areas, why_stem, leader_prompts.
- If there is no match, the requirement is NOT automatically included. It can be
  added later via CMS overrides.

Run
  python tools/build_badges_master_from_csv.py
  python tools/generate_badges.py
  python tools/generate_stem_badge_map.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
BADGES_MASTER = ROOT / "_data" / "badges_master.json"
OUT_JSON = ROOT / "assets" / "data" / "stem_badge_map.json"
OLD_JSON = ROOT / "assets" / "data" / "stem_badge_map.json"


def _slug(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9\-]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def _section_label(section_slug: str) -> str:
    if section_slug == "staged":
        return "Staged"
    return section_slug.capitalize()


def main() -> None:
    if not BADGES_MASTER.exists():
        raise SystemExit(f"Missing {BADGES_MASTER}")

    badges: List[Dict[str, Any]] = json.loads(BADGES_MASTER.read_text(encoding="utf-8"))

    # Load current map as "old" for carry-over (if present)
    old_map: Dict[str, Any] = {"badges": []}
    if OLD_JSON.exists():
        try:
            old_map = json.loads(OLD_JSON.read_text(encoding="utf-8"))
        except Exception:
            old_map = {"badges": []}

    old_badges = old_map.get("badges") if isinstance(old_map, dict) else []
    if not isinstance(old_badges, list):
        old_badges = []

    # Index old requirements by (badge_id, text)
    old_idx: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for b in old_badges:
        bid = str(b.get("badge_id") or "")
        for r in (b.get("stem_requirements") or []):
            if not isinstance(r, dict):
                continue
            text = str(r.get("text") or "").strip()
            if not bid or not text:
                continue
            old_idx[(bid, text)] = r

    out_badges: List[Dict[str, Any]] = []

    for b in badges:
        badge_id = str(b.get("id") or "").strip()
        if not badge_id:
            continue

        req_items = b.get("requirements") or []
        if not isinstance(req_items, list):
            req_items = []

        stem_requirements: List[Dict[str, Any]] = []

        for item in req_items:
            if not isinstance(item, dict):
                continue
            if item.get("kind") not in (None, "req"):
                continue

            ref = str(item.get("id") or item.get("no") or "").strip()
            text = str(item.get("text") or "").strip()
            if not ref or not text:
                continue

            carry = old_idx.get((badge_id, text))
            if not carry:
                continue  # not auto-included

            rid = f"{badge_id}::{_slug(ref)}"
            stem_requirements.append(
                {
                    "rid": rid,
                    "ref": ref,
                    "text": text,
                    "strength": carry.get("strength", "borderline"),
                    "areas": carry.get("areas", []),
                    "why_stem": carry.get("why_stem", ""),
                    "leader_prompts": carry.get("leader_prompts", []),
                }
            )

        if not stem_requirements:
            continue

        out_badges.append(
            {
                "badge_id": badge_id,
                "title": b.get("badge_name") or b.get("title") or badge_id,
                "section": b.get("section_label") or _section_label(str(b.get("section") or "")),
                "section_slug": str(b.get("section") or ""),
                "category": b.get("category") or "",
                "badge_type": b.get("type") or "",
                "stem_requirements": stem_requirements,
            }
        )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({"badges": out_badges}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_JSON} with {len(out_badges)} badges")


if __name__ == "__main__":
    main()
