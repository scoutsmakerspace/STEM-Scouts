#!/usr/bin/env python3
"""Generate the Decap-friendly `_badges/` collection from `_data/badges_master.json`.

Why
- `_data/badges_master.json` is the single source of truth.
- Decap relation widgets need a collection (many entries) to search + select from.

This script:
- reads `_data/badges_master.json`
- writes `_badges/<id>.md` files (front matter + human-readable list)
- copies the master JSON to `admin/badges_master.json` so the custom requirement widget can read it.

Usage
  python tools/generate_badges.py
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "_data" / "badges_master.json"
ADMIN_JSON = ROOT / "admin" / "badges_master.json"
OUT_DIR = ROOT / "_badges"


def _clean_id(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s


def main() -> None:
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA}")

    raw = json.loads(DATA.read_text(encoding="utf-8"))
    badges = raw["badges"] if isinstance(raw, dict) and "badges" in raw else raw

    if not isinstance(badges, list):
        raise SystemExit("badges_master.json must be a list or an object with a 'badges' list")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Clean out old generated files
    for f in OUT_DIR.glob("*.md"):
        f.unlink()

    written = 0
    for b in badges:
        if not isinstance(b, dict):
            continue

        bid = str(b.get("id") or "").strip()
        if not bid:
            # Build a fallback ID from section+badge_name
            bid = f"{b.get('section','')}-{b.get('badge_name','')}"
            bid = _clean_id(bid)

        title = str(b.get("badge_name") or b.get("title") or bid)
        section = str(b.get("section") or "").strip().lower()
        category = str(b.get("category") or "").strip()
        badge_type = str(b.get("type") or "").strip()
        completion_rules = str(b.get("completion_rules") or "").strip()
        requirements = b.get("requirements") or []

        # YAML front matter (simple + safe)
        lines = [
            "---",
            "layout: badge",
            f'title: "{title.replace("\"", "\\\"")}"',
            f'id: "{bid}"',
            f'section: "{section}"',
        ]
        if category:
            lines.append(f'category: "{category.replace("\"", "\\\"")}"')
        if badge_type:
            lines.append(f'badge_type: "{badge_type.replace("\"", "\\\"")}"')
        if completion_rules:
            lines.append(f'completion_rules: "{completion_rules.replace("\"", "\\\"")}"')

        # requirements list
        if isinstance(requirements, list) and requirements:
            lines.append(f"requirements_count: {sum(1 for r in requirements if isinstance(r, dict) and r.get('no') is not None)}")
            lines.append("requirements:")
            for r in requirements:
                if not isinstance(r, dict):
                    continue
                no = r.get("no", None)
                text = str(r.get("text") or "").strip()
                # keep non-numbered lines too
                if no is None or no == "":
                    lines.append("  - no:")
                else:
                    try:
                        no = int(no)
                    except Exception:
                        # keep as string if it can't be cast
                        lines.append(f"  - no: {json.dumps(no)}")
                    else:
                        lines.append(f"  - no: {no}")
                lines.append(f"    text: {json.dumps(text)}")

        lines.append("---")
        lines.append("")
        lines.append("## Requirements")
        lines.append("")

        if isinstance(requirements, list) and requirements:
            for r in requirements:
                if not isinstance(r, dict):
                    continue
                no = r.get("no", None)
                text = str(r.get("text") or "").strip()
                if no is None or no == "":
                    lines.append(f"- {text}")
                else:
                    lines.append(f"- **{no}.** {text}")
        else:
            lines.append("- (No requirements found)")

        (OUT_DIR / f"{bid}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        written += 1

    # Copy master JSON into /admin so the CMS can fetch it at runtime
    ADMIN_JSON.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Generated {written} badge files into {OUT_DIR}")
    print(f"Wrote {ADMIN_JSON}")


if __name__ == "__main__":
    main()
