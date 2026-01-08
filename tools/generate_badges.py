#!/usr/bin/env python3
"""
Generate the Decap-friendly `_badges/*.md` collection from `_data/badges_master.json`.

Why:
- We keep ONE canonical file: `_data/badges_master.json`
- Decap relation widgets need a collection of entries, so we generate `_badges/` automatically.

Usage:
  python tools/generate_badges.py
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "_data" / "badges_master.json"
OUTDIR = ROOT / "_badges"


def _esc(s: str) -> str:
    return (s or "").replace('"', '\\"')


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"Missing {MASTER}")

    data = json.loads(MASTER.read_text(encoding="utf-8"))
    badges = data.get("badges", [])
    if not isinstance(badges, list) or not badges:
        raise SystemExit("No badges found in badges_master.json")

    if OUTDIR.exists():
        # delete existing md files only
        for p in OUTDIR.glob("*.md"):
            p.unlink()
    else:
        OUTDIR.mkdir(parents=True, exist_ok=True)

    for b in badges:
        badge_id = b["id"]
        title = b.get("badge_name", badge_id)
        section = b.get("section", "")
        category = b.get("category", "")

        req_lines = []
        for r in b.get("requirements", []) or []:
            no = r.get("no")
            txt = (r.get("text") or "").strip()
            if not txt:
                continue
            if no is None or no == "":
                req_lines.append(txt)
            else:
                try:
                    no_i = int(no)
                    req_lines.append(f"{no_i}. {txt}")
                except Exception:
                    req_lines.append(f"{no}. {txt}")

        fm = [
            "---",
            f'title: "{_esc(title)}"',
            f'id: "{_esc(badge_id)}"',
            f'section: "{_esc(section)}"',
            f'category: "{_esc(category)}"',
        ]
        rc = b.get("requirements_count")
        if rc is not None:
            try:
                fm.append(f"requirements_count: {int(rc)}")
            except Exception:
                pass

        fm.append("requirements:")
        for line in req_lines:
            fm.append(f'  - "{_esc(line)}"')
        fm.append("---")

        body = ["", "## Requirements", ""]
        body.extend([f"- {line}" for line in req_lines])
        body.append("")

        (OUTDIR / f"{badge_id}.md").write_text("\n".join(fm + body), encoding="utf-8")

    print(f"Generated {len(badges)} badge files in {OUTDIR}")


if __name__ == "__main__":
    main()
