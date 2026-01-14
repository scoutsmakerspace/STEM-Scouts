from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List

import yaml

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "_data" / "badges_catalog.yml"
BADGES_DIR = ROOT / "_badges"

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _load_catalog() -> List[Dict[str, Any]]:
    if not CATALOG_PATH.exists():
        return []
    data = yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return []
    badges = data.get("badges", [])
    return badges if isinstance(badges, list) else []


def _front_matter_for_badge(b: Dict[str, Any]) -> Dict[str, Any]:
    badge_id = str(b.get("id") or "").strip()
    title = str(b.get("title") or "").strip()
    status = str(b.get("status") or "active").strip().lower()

    fm: Dict[str, Any] = {
        "layout": "badge",
        "title": title or badge_id,
        "id": badge_id,
        "status": status if status in {"active", "retired"} else "active",
    }

    section = str(b.get("section") or "").strip()
    if section:
        fm["section"] = section

    category = str(b.get("category") or "").strip()
    if category:
        fm["category"] = category

    badge_type = str(b.get("badge_type") or "").strip()
    if badge_type:
        fm["badge_type"] = badge_type

    completion_rules = str(b.get("completion_rules") or "").strip()
    if completion_rules:
        fm["completion_rules"] = completion_rules

    icon = str(b.get("icon") or "").strip()
    if icon:
        fm["icon"] = icon

    # Requirements: store as a simple list of strings.
    # Numbering is intrinsic (rendered by the site/UI), so we never store explicit numbers.
    reqs_in = b.get("requirements")
    reqs_out: List[str] = []
    if isinstance(reqs_in, list):
        for r in reqs_in:
            if r is None:
                continue
            # Allow either strings or legacy dicts {no,text}
            if isinstance(r, str):
                text = r.strip()
            elif isinstance(r, dict):
                text = str(r.get("text") or "").strip()
            else:
                text = str(r).strip()
            if text:
                reqs_out.append(text)
    if reqs_out:
        fm["requirements"] = reqs_out
        fm["requirements_count"] = len(reqs_out)

    return fm


def _write_markdown(path: Path, frontmatter: Dict[str, Any]) -> None:
    # Deterministic YAML for git diffs
    yml = yaml.safe_dump(frontmatter, sort_keys=False, allow_unicode=True)
    body = "---\n" + yml + "---\n"
    path.write_text(body, encoding="utf-8")


def main() -> int:
    BADGES_DIR.mkdir(parents=True, exist_ok=True)

    badges = _load_catalog()
    if not badges:
        print("No badges in _data/badges_catalog.yml; nothing to sync.")
        return 0

    wrote = 0
    for b in badges:
        if not isinstance(b, dict):
            continue
        badge_id = str(b.get("id") or "").strip()
        if not badge_id:
            continue
        if not ID_RE.match(badge_id):
            raise SystemExit(
                f"Invalid badge id '{badge_id}' in {CATALOG_PATH}. "
                "IDs must match ^[a-z0-9]+(?:-[a-z0-9]+)*$"
            )

        fm = _front_matter_for_badge(b)
        out_path = BADGES_DIR / f"{badge_id}.md"
        _write_markdown(out_path, fm)
        wrote += 1

    print(f"Synced {wrote} badge markdown files from {CATALOG_PATH}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
