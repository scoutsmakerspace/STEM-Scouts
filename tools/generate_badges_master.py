#!/usr/bin/env python3
"""
Generate badges_master.json for STEM-Scouts (admin + Jekyll _data).

Key guarantees:
- Rebuilds from the current contents of `_badges/` (no stale entries). Deleting a badge file removes it everywhere.
- Always produces the schema expected by the STEM Badge Map Manager widget:
  [{ id, badge_name, section, section_label, category, badge_type, completion_rules, requirements:[{kind:"req", no, text}, ...] }, ...]
- Normalises badge icons to:
    assets/images/badges/<id>.png
    assets/images/badges/<id>_64.png
  by copying/converting from common CMS upload locations.

This script is intended to be run in GitHub Actions.
"""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from PIL import Image, ImageOps

BADGES_DIR = Path("_badges")
OUT_ADMIN = Path("admin/badges_master.json")
OUT_DATA = Path("_data/badges_master.json")

BADGES_IMG_DIR = Path("assets/images/badges")
UPLOADS_IMG_DIR = Path("assets/images/uploads")

ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _read_frontmatter(md_path: Path) -> Tuple[Dict[str, Any], str]:
    txt = md_path.read_text(encoding="utf-8")
    if not txt.startswith("---"):
        return {}, txt
    parts = txt.split("---", 2)
    if len(parts) < 3:
        return {}, txt
    fm = yaml.safe_load(parts[1]) or {}
    body = parts[2].lstrip("\n")
    return (fm if isinstance(fm, dict) else {}), body


def _section_label(section: str) -> str:
    return section[:1].upper() + section[1:] if section else ""


def _safe_str(x: Any) -> str:
    return "" if x is None else str(x)


def _parse_requirements(fm: Dict[str, Any], body: str) -> List[Dict[str, str]]:
    """
    Return list of {no, text} from:
    - fm.requirements (preferred)
    - numbered Markdown in body (fallback)
    - legacy `false:` YAML key (parsed as False) (fallback)
    """
    out: List[Dict[str, str]] = []

    reqs = fm.get("requirements")
    if isinstance(reqs, list):
        for r in reqs:
            if not isinstance(r, dict):
                continue
            no = _safe_str(r.get("no") or r.get("id") or "").strip()
            text = _safe_str(r.get("text") or "").strip()
            if no and text:
                out.append({"no": no, "text": text})
        if out:
            return out

    # Numbered Markdown list in body
    for m in re.finditer(r"^\s*(\d+)[\.\)]\s+(.*)$", body, flags=re.M):
        no = m.group(1).strip()
        text = m.group(2).strip()
        if no and text:
            out.append({"no": no, "text": text})
    if out:
        return out

    # Legacy YAML key: false:
    if False in fm and isinstance(fm[False], list):
        for i, t in enumerate(fm[False], start=1):
            text = _safe_str(t).strip()
            if text:
                out.append({"no": str(i), "text": text})
    return out


def _heading_from_completion(completion_rules: str, has_reqs: bool) -> str:
    cr = (completion_rules or "").strip()
    if not cr:
        return "Complete ALL of the following" if has_reqs else "(No requirements found)"
    if cr.lower().startswith("complete all"):
        return "Complete ALL of the following"
    if cr.lower().startswith("choose "):
        return "Choose 1 of the following options"
    return cr


def _find_icon_source(fm: Dict[str, Any], badge_id: str, md_path: Path) -> Optional[Path]:
    """
    Try to locate the icon file that corresponds to this badge.
    We accept a few common cases:
    - fm.icon points to /assets/images/badges/<something>
    - file already exists at assets/images/badges/<id>.(png|jpg|jpeg|webp)
    - CMS mistakenly stored it under _badges/assets/images/badges/<id>...
    - CMS uploads folder assets/images/uploads/<id>...
    """
    # 1) From frontmatter icon path
    icon_val = _safe_str(fm.get("icon")).strip()
    if icon_val:
        # strip leading slash
        rel = icon_val[1:] if icon_val.startswith("/") else icon_val
        cand = Path(rel)
        if cand.exists():
            return cand
        # sometimes stored relative to the entry folder
        cand2 = md_path.parent / rel
        if cand2.exists():
            return cand2

    # 2) canonical files
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = BADGES_IMG_DIR / f"{badge_id}{ext}"
        if cand.exists():
            return cand

    # 3) misplaced under _badges/assets/images/badges/...
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = BADGES_DIR / "assets/images/badges" / f"{badge_id}{ext}"
        if cand.exists():
            return cand

    # 4) uploads folder
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = UPLOADS_IMG_DIR / f"{badge_id}{ext}"
        if cand.exists():
            return cand

    return None


def _normalise_icon_to_png(src: Path, dst_png: Path, dst_64: Path) -> None:
    dst_png.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGBA")
        # save full PNG
        im.save(dst_png, format="PNG", optimize=True)

        # make 64x64 (contain, keep aspect)
        thumb = im.copy()
        thumb.thumbnail((64, 64), Image.Resampling.LANCZOS)
        # center on 64x64 transparent canvas
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        x = (64 - thumb.width) // 2
        y = (64 - thumb.height) // 2
        canvas.paste(thumb, (x, y))
        canvas.save(dst_64, format="PNG", optimize=True)


def build_master() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []

    for md in sorted(BADGES_DIR.rglob("*.md")):
        fm, body = _read_frontmatter(md)
        if not fm:
            continue

        badge_id = _safe_str(fm.get("id")).strip()
        if not badge_id or not ID_PATTERN.match(badge_id):
            # skip invalid entries (or raise if you prefer)
            continue

        if _safe_str(fm.get("keep")).strip().lower() == "no":
            continue

        badge_name = _safe_str(fm.get("title") or fm.get("badge_name") or badge_id).strip()
        section = _safe_str(fm.get("section")).strip()
        category = _safe_str(fm.get("category")).strip()
        badge_type = _safe_str(fm.get("badge_type") or fm.get("type")).strip()

        completion_rules = _safe_str(fm.get("completion_rules")).strip()
        reqs_simple = _parse_requirements(fm, body)

        # Always include a heading row first (widget expects it)
        heading_text = _heading_from_completion(completion_rules, bool(reqs_simple))
        requirements: List[Dict[str, Any]] = [{
            "kind": "req",
            "no": "heading",
            "text": heading_text,
            "heading": True,
        }]

        # Always include at least one real requirement so expansion works for newly created badges
        if not reqs_simple:
            reqs_simple = [{"no": "1", "text": "Complete the requirements for this badge."}]

        for r in reqs_simple:
            requirements.append({
                "kind": "req",
                "no": _safe_str(r["no"]).strip(),
                "text": _safe_str(r["text"]).strip(),
            })

        # Icon normalisation
        src_icon = _find_icon_source(fm, badge_id, md)
        dst_png = BADGES_IMG_DIR / f"{badge_id}.png"
        dst_64 = BADGES_IMG_DIR / f"{badge_id}_64.png"
        if src_icon:
            try:
                _normalise_icon_to_png(src_icon, dst_png, dst_64)
            except Exception:
                # don't fail generation if icon conversion fails
                pass

        # Ensure frontmatter icon points to canonical path (site can use this too)
        icon_url = f"/assets/images/badges/{badge_id}.png"

        out.append({
            "id": badge_id,
            "badge_name": badge_name,
            "section": section,
            "section_label": _section_label(section),
            "category": category,
            "badge_type": badge_type,
            "completion_rules": completion_rules,
            "icon": icon_url,
            "icon_64": f"/assets/images/badges/{badge_id}_64.png",
            "requirements": requirements,
        })

    out.sort(key=lambda b: (b.get("section",""), b.get("category",""), b.get("badge_name","")))
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
