#!/usr/bin/env python3
"""
Prune retired badges from:
- STEM mapping (_data/stem_badge_map.yml)
- Activities frontmatter (_activities/*.md) -> badge_links
This is run by GitHub Actions so the repo stays consistent after a badge is retired.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml


ROOT = Path(__file__).resolve().parents[1]
BADGES_CATALOG = ROOT / "_data" / "badges_catalog.yml"
STEM_BADGE_MAP = ROOT / "_data" / "stem_badge_map.yml"
ACTIVITIES_DIR = ROOT / "_activities"


def _load_yaml(path: Path) -> Any:
    if not path.exists():
        return None
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _dump_yaml(data: Any) -> str:
    # Keep it readable and stable-ish
    return yaml.safe_dump(
        data,
        sort_keys=False,
        allow_unicode=True,
        width=120,
        default_flow_style=False,
    )


def _get_retired_ids(catalog: Dict[str, Any]) -> List[str]:
    badges = catalog.get("badges", []) if isinstance(catalog, dict) else []
    retired = []
    for b in badges:
        if not isinstance(b, dict):
            continue
        bid = b.get("id")
        status = (b.get("status") or "").strip().lower()
        if bid and status == "retired":
            retired.append(str(bid))
    return retired


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _split_frontmatter(text: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Returns: (fm_dict, fm_raw, body)
    If no frontmatter, returns ({}, "", full_text)
    """
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return {}, "", text
    fm_raw = m.group(1)
    body = text[m.end():]
    fm = yaml.safe_load(fm_raw) or {}
    if not isinstance(fm, dict):
        fm = {}
    return fm, fm_raw, body


def _rebuild_with_frontmatter(fm: Dict[str, Any], body: str) -> str:
    return "---\n" + _dump_yaml(fm).rstrip() + "\n---\n" + body.lstrip("\n")


def prune_stem_badge_map(retired_ids: List[str]) -> bool:
    if not STEM_BADGE_MAP.exists():
        return False
    data = _load_yaml(STEM_BADGE_MAP)
    if not isinstance(data, dict) or "badges" not in data:
        return False

    badges = data.get("badges") or []
    if not isinstance(badges, list):
        return False

    before = len(badges)
    badges = [b for b in badges if not (isinstance(b, dict) and str(b.get("badge_id")) in retired_ids)]
    after = len(badges)

    if after == before:
        return False

    data["badges"] = badges
    STEM_BADGE_MAP.write_text(_dump_yaml(data), encoding="utf-8")
    print(f"[prune] stem_badge_map.yml: removed {before - after} retired badges")
    return True


def prune_activities(retired_ids: List[str]) -> bool:
    if not ACTIVITIES_DIR.exists():
        return False

    changed_any = False

    for md in sorted(ACTIVITIES_DIR.glob("*.md")):
        txt = md.read_text(encoding="utf-8")
        fm, _fm_raw, body = _split_frontmatter(txt)
        if not fm:
            continue

        links = fm.get("badge_links")
        if not isinstance(links, list):
            continue

        before = len(links)
        new_links = []
        for item in links:
            if isinstance(item, dict) and str(item.get("badge_id")) in retired_ids:
                continue
            new_links.append(item)

        if len(new_links) != before:
            fm["badge_links"] = new_links
            md.write_text(_rebuild_with_frontmatter(fm, body), encoding="utf-8")
            print(f"[prune] {md.name}: removed {before - len(new_links)} retired badge_links")
            changed_any = True

    return changed_any


def main() -> int:
    catalog = _load_yaml(BADGES_CATALOG)
    if not isinstance(catalog, dict):
        print("[prune] badges_catalog.yml missing or invalid, nothing to do.")
        return 0

    retired_ids = _get_retired_ids(catalog)
    if not retired_ids:
        print("[prune] No retired badges found.")
        return 0

    changed = False
    changed |= prune_stem_badge_map(retired_ids)
    changed |= prune_activities(retired_ids)

    if changed:
        print("[prune] Done (changes written).")
    else:
        print("[prune] Done (no changes needed).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
