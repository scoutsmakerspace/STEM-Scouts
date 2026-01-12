#!/usr/bin/env python3
"""Normalise badge icon images to PNG and create 64x64 variants.

Sources:
- Badge entries in _badges/*.md (top-level) may specify an `icon` field
  (a path into assets/images/badges/ due to per-field media_folder).

Outputs:
- assets/images/badges/<id>.png
- assets/images/badges/<id>_64.png

Notes:
- We do NOT delete the original uploaded file. That avoids surprises.
- If the `icon` field is empty, we do nothing (user can still manually
  provide assets/images/badges/<id>.png).
"""

from __future__ import annotations

import glob
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import yaml

try:
    from PIL import Image
except Exception as e:
    raise RuntimeError(
        "Pillow is required. Install with: pip install pillow"
    ) from e

RE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

ROOT = Path(__file__).resolve().parents[1]
BADGES_DIR = ROOT / "_badges"
OUT_DIR = ROOT / "assets" / "images" / "badges"


def _split_frontmatter(md_text: str) -> Tuple[Optional[str], str]:
    if not md_text.startswith("---"):
        return None, md_text
    parts = md_text.split("---", 2)
    if len(parts) < 3:
        return None, md_text
    # parts[0] == ""
    fm = parts[1].strip("\n")
    body = parts[2]
    return fm, body


def _load_frontmatter(path: Path) -> Dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    fm, _ = _split_frontmatter(text)
    if fm is None:
        return {}
    data = yaml.safe_load(fm) or {}
    if not isinstance(data, dict):
        return {}
    return data


def _norm_icon_path(icon_value: str) -> Optional[Path]:
    if not icon_value:
        return None
    v = icon_value.strip()
    if not v:
        return None
    # Allow /assets/... or assets/...
    if v.startswith("/"):
        v = v[1:]
    p = (ROOT / v).resolve()
    try:
        p.relative_to(ROOT)
    except Exception:
        return None
    if not p.exists():
        return None
    return p


def _save_png(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGBA")
        im.save(dst, format="PNG", optimize=True)


def _save_png_64(src_png: Path, dst_64: Path) -> None:
    dst_64.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_png) as im:
        im = im.convert("RGBA")
        # Resize to fit within 64x64 while preserving aspect ratio
        im.thumbnail((64, 64), Image.LANCZOS)
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        x = (64 - im.width) // 2
        y = (64 - im.height) // 2
        canvas.paste(im, (x, y))
        canvas.save(dst_64, format="PNG", optimize=True)


def main() -> int:
    badge_files = sorted(Path(p) for p in glob.glob(str(BADGES_DIR / "*.md")))
    if not badge_files:
        print("No _badges/*.md files found.")
        return 0

    changed = False

    for f in badge_files:
        fm = _load_frontmatter(f)
        badge_id = str(fm.get("id", "")).strip()
        if not badge_id:
            continue
        if not RE_ID.match(badge_id):
            print(f"SKIP: invalid badge id '{badge_id}' in {f.name}")
            continue
        keep = str(fm.get("keep", "yes")).strip().lower()
        status = str(fm.get("status", "active")).strip().lower()
        if keep == "no" or status != "active":
            continue

        icon_value = fm.get("icon")
        if not icon_value:
            # Nothing uploaded; user may rely on manual assets/images/badges/<id>.png
            continue

        src = _norm_icon_path(str(icon_value))
        if src is None:
            print(f"WARN: icon path not found for {badge_id}: {icon_value}")
            continue

        dst = OUT_DIR / f"{badge_id}.png"
        dst64 = OUT_DIR / f"{badge_id}_64.png"

        # Only regenerate if source is newer or output missing
        def _needs_regen(out: Path) -> bool:
            if not out.exists():
                return True
            return src.stat().st_mtime > out.stat().st_mtime

        if _needs_regen(dst) or _needs_regen(dst64):
            _save_png(src, dst)
            _save_png_64(dst, dst64)
            changed = True
            print(f"OK: {badge_id} -> {dst.relative_to(ROOT)}, {dst64.relative_to(ROOT)}")

    if changed:
        print("Icons updated.")
    else:
        print("No icon updates needed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
