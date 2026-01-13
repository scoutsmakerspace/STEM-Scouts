#!/usr/bin/env python3
"""Generate badges_master.json for STEM-Scouts.

The CMS edits badges as Markdown in _badges/*.md (top-level).
The Mapping widgets (CMS + public mapping page) rely on badges_master.json.

We rebuild badges_master.json from the badge Markdown files, but preserve
fields that are not stored in the Markdown front matter (notably
`description`) by pulling them from the existing master file.

Only badges with keep != 'no' are included. If a badge has a `status`
front-matter field, only `active` badges are included.

Outputs:
- admin/badges_master.json
- _data/badges_master.json

This script is intentionally conservative to avoid regressions.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml

ROOT = Path(__file__).resolve().parents[1]
BADGES_DIR = ROOT / "_badges"
BASE_ADMIN = ROOT / "admin" / "badges_master.json"
BASE_DATA = ROOT / "_data" / "badges_master.json"
OUT_ADMIN = ROOT / "admin" / "badges_master.json"
OUT_DATA = ROOT / "_data" / "badges_master.json"

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def _parse_front_matter(md_text: str) -> Dict[str, Any]:
    """Return YAML front matter dict. If none, returns empty."""
    if not md_text.startswith("---"):
        return {}
    parts = md_text.split("---", 2)
    if len(parts) < 3:
        return {}
    fm = parts[1]
    data = yaml.safe_load(fm) or {}
    if not isinstance(data, dict):
        return {}
    return data


def _section_label(section: str) -> str:
    return section[:1].upper() + section[1:]


def _heading_from_completion(completion_rules: str, has_reqs: bool) -> str:
    cr = (completion_rules or "").strip()
    if not cr:
        return "Complete ALL of the following" if has_reqs else "(No requirements found)"

    # Common patterns used in the existing master file
    if cr.lower().startswith("complete all"):
        # e.g. "Complete ALL 4 requirements" -> standard heading
        return "Complete ALL of the following"

    if cr.lower().startswith("choose "):
        # e.g. "Choose 1 of 3 options" -> standard heading
        return "Choose 1 of the following options"

    # If there are no requirements, badges like Nights Away / Hikes / Time on water
    # have a single heading that includes "to earn this badge."
    if not has_reqs:
        if "to earn this badge" in cr.lower():
            return cr if cr.endswith(".") else (cr + ".")
        # If it looks like "Complete X ...", add the suffix.
        if cr.lower().startswith("complete "):
            text = cr
            if not text.endswith("."):
                text += ""
            # Always end with a period after the suffix.
            return (text + " to earn this badge.").replace("..", ".")
        return cr if cr.endswith(".") else (cr + ".")

    # Otherwise, if the rules already read like a heading, keep them.
    return cr


def _requirements_from_front_matter(fm: Dict[str, Any]) -> List[Dict[str, str]]:
    """Return requirements as [{'no': '1', 'text': '...'}, ...].

    Badge files may store requirements as either:
      1) A list of dicts with keys like {no/text} (legacy)
      2) A list of strings (new Badges Manager format)

    We keep numbering *intrinsic* (derived from list order) for the string format.
    """
    reqs = fm.get("requirements")
    if not isinstance(reqs, list):
        return []

    # New format: list of strings
    if reqs and all(isinstance(r, str) for r in reqs):
        out: List[Dict[str, str]] = []
        for i, s in enumerate(reqs, start=1):
            t = str(s).strip()
            if not t:
                continue
            out.append({"no": str(i), "text": t})
        return out

    # Legacy format: list of dicts
    out: List[Dict[str, str]] = []
    for r in reqs:
        if not isinstance(r, dict):
            continue
        # Historical badge files in this repo store requirement numbers under a
        # YAML key that becomes the boolean False when parsed (rendered as
        # "false" in some editors), e.g.
        #   - false: 1
        #     text: "1. Do something"
        # Newer/cleaner files may use "no".
        no = (
            r.get("no")
            or r.get("id")
            or r.get(False)  # YAML `false:` key
            or r.get("false")
        )
        text = r.get("text")
        if no is None or text is None:
            continue
        out.append({"no": str(no).strip(), "text": str(text).strip()})
    return out


def _load_base_master() -> Dict[str, Dict[str, Any]]:
    # Prefer _data/badges_master.json as it is used by the site.
    base_path = BASE_DATA if BASE_DATA.exists() else BASE_ADMIN
    if not base_path.exists():
        return {}
    data = json.loads(_read_text(base_path))
    if not isinstance(data, list):
        return {}
    by_id: Dict[str, Dict[str, Any]] = {}
    for item in data:
        if isinstance(item, dict) and "id" in item:
            by_id[str(item["id"])]= item
    return by_id


def _collect_badge_markdown_files() -> List[Path]:
    # Top-level only: _badges/*.md (this is what CMS uses today)
    return sorted(BADGES_DIR.glob("*.md"))


def _build_badge_json(frontmatter: Dict[str, Any], base: Dict[str, Any]) -> Dict[str, Any]:
    """Build a badge entry using markdown frontmatter, preserving baseline-only fields."""
    badge_id = str(frontmatter.get("id") or "").strip()
    title = str(frontmatter.get("title") or "").strip()

    section = str(frontmatter.get("section") or "").strip()
    category = str(frontmatter.get("category") or "").strip()
    badge_type = str(frontmatter.get("badge_type") or frontmatter.get("type") or "").strip()
    completion_rules = str(frontmatter.get("completion_rules") or "").strip()

    req_pairs = _requirements_from_front_matter(frontmatter)
    has_reqs = len(req_pairs) > 0
    heading_text = _heading_from_completion(completion_rules, has_reqs)

    reqs_json: List[Dict[str, str]] = []
    if heading_text:
        reqs_json.append({"kind": "heading", "text": heading_text})
    for r in req_pairs:
        no = r["no"]
        text = r["text"]
        reqs_json.append({
            "kind": "req",
            "id": no,
            "no": no,
            "text": text,
        })

    # Preserve description from baseline (markdown doesn't store it yet)
    description = str(base.get("description") or "").strip()

    return {
        "id": badge_id,
        "badge_name": title or badge_id,
        "section": section,
        "section_label": _section_label(section) if section else "",
        "category": category,
        "type": badge_type,
        "description": description,
        "completion_rules": completion_rules,
        "requirements": reqs_json,
    }


def build_master() -> List[Dict[str, Any]]:
    """Build the master list.

    Key rule to avoid regressions:
    - The existing master JSON is the source-of-truth for the *set* of badges.
      (This repo currently contains some stray _badges/*.md files not present
      in the master JSON, and a couple of legacy badges present in the master
      but not in _badges/. Deleting those accidentally would break the mapping
      UI.)

    Therefore:
    - Start from the baseline master JSON.
    - Apply overrides from _badges/*.md *for IDs that already exist*.
    - Only add new badges when the Markdown entry includes an explicit
      `status: active` (new CMS entries will always include this field).
    - Exclude a badge only when the Markdown entry explicitly sets
      `status: retired` or `keep: no`.
    """

    base_by_id = _load_base_master()  # id -> badge dict
    out_by_id: Dict[str, Dict[str, Any]] = {k: dict(v) for k, v in base_by_id.items()}

    for md_path in _collect_badge_markdown_files():
        fm = _parse_front_matter(_read_text(md_path))
        badge_id = str(fm.get("id") or "").strip()
        if not badge_id:
            continue

        # Validate ID format early (new entries must be clean).
        if not ID_RE.match(badge_id):
            raise SystemExit(
                f"Invalid badge id '{badge_id}' in {md_path}. "
                "IDs must match: ^[a-z0-9]+(?:-[a-z0-9]+)*$"
            )

        keep = str(fm.get("keep") or "yes").strip().lower()
        status_raw = fm.get("status")
        status = str(status_raw or "").strip().lower()

        # Explicit excludes
        if keep == "no":
            out_by_id.pop(badge_id, None)
            continue
        if status and status != "active":
            out_by_id.pop(badge_id, None)
            continue

        is_in_base = badge_id in base_by_id
        is_explicit_new = (not is_in_base) and (status == "active")  # new CMS entries

        if not is_in_base and not is_explicit_new:
            # Ignore stray/legacy Markdown files that aren't part of the baseline set.
            continue

        # Build/override using markdown fields, but keep baseline description (not stored in markdown).
        base = base_by_id.get(badge_id, {})
        built = _build_badge_json(fm, base)
        out_by_id[badge_id] = built

    out = list(out_by_id.values())
    out.sort(key=lambda b: (b.get("section", ""), b.get("category", ""), b.get("badge_name", "")))
    return out


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    master = build_master()
    _write_json(OUT_ADMIN, master)
    _write_json(OUT_DATA, master)
    print(f"Wrote {len(master)} badges -> {OUT_ADMIN} and {OUT_DATA}")


if __name__ == "__main__":
    main()
