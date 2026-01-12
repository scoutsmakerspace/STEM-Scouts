#!/usr/bin/env python3
"""
Normalise badge icons to canonical PNG names and generate 64×64 thumbnails.

Rules:
- Canonical icon paths:
    assets/images/badges/<id>.png
    assets/images/badges/<id>_64.png
- Source image is taken from badge front-matter `icon` if present and exists,
  otherwise from the canonical <id>.png if it exists.
- Any size/format is accepted; output is always PNG.
- The badge Markdown front-matter `icon` is rewritten to the canonical path
  when a source image exists.

This runs in CI to keep the site and mapping stable.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BADGES_DIR = ROOT / "_badges"
BADGE_IMG_DIR = ROOT / "assets" / "images" / "badges"

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

CANON_ICON_PUBLIC = "/assets/images/badges/{id}.png"
CANON_ICON_FILE = BADGE_IMG_DIR / "{id}.png"
CANON_ICON_64_FILE = BADGE_IMG_DIR / "{id}_64.png"


def _read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def _write_text(p: Path, s: str) -> None:
    p.write_text(s, encoding="utf-8")


def _parse_front_matter(md: str) -> Tuple[Dict[str, Any], str]:
    """Return (frontmatter, body). If no frontmatter, returns ({}, full_text)."""
    if not md.startswith("---"):
        return {}, md
    parts = md.split("---", 2)
    if len(parts) < 3:
        return {}, md
    fm_text = parts[1]
    body = parts[2]
    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        fm = {}
    return fm, body


def _dump_front_matter(fm: Dict[str, Any], body: str) -> str:
    fm_text = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).strip()
    return f"---\n{fm_text}\n---{body}"


def _resolve_icon_source(fm: Dict[str, Any], badge_id: str) -> Optional[Path]:
    icon = fm.get("icon")
    if isinstance(icon, str) and icon.strip():
        # allow leading slash
        rel = icon.strip().lstrip("/")
        p = ROOT / rel
        if p.exists() and p.is_file():
            return p
    # fallback to canonical id.png if present
    p2 = Path(str(CANON_ICON_FILE).format(id=badge_id))
    if p2.exists() and p2.is_file():
        return p2
    return None


def _open_image(path: Path) -> Image.Image:
    im = Image.open(path)
    # convert to RGBA to preserve transparency
    if im.mode not in ("RGBA", "LA"):
        im = im.convert("RGBA")
    else:
        im = im.convert("RGBA")
    return im


def _save_png(im: Image.Image, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_path, format="PNG", optimize=True)


def _make_64(im: Image.Image) -> Image.Image:
    # contain within 64x64, then paste centered onto 64x64 transparent background
    target = (64, 64)
    im2 = im.copy()
    im2.thumbnail(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target, (0, 0, 0, 0))
    x = (target[0] - im2.size[0]) // 2
    y = (target[1] - im2.size[1]) // 2
    canvas.paste(im2, (x, y), im2)
    return canvas


def main() -> None:
    BADGE_IMG_DIR.mkdir(parents=True, exist_ok=True)

    changed = 0
    for md_path in sorted(BADGES_DIR.glob("*.md")):
        md = _read_text(md_path)
        fm, body = _parse_front_matter(md)
        badge_id = str(fm.get("id") or "").strip()
        if not badge_id:
            continue
        if not ID_RE.match(badge_id):
            raise SystemExit(
                f"Invalid badge id '{badge_id}' in {md_path}. "
                "IDs must match: ^[a-z0-9]+(?:-[a-z0-9]+)*$"
            )

        keep = str(fm.get("keep") or "yes").strip().lower()
        status = str(fm.get("status") or "active").strip().lower()
        if keep == "no" or (status and status != "active"):
            continue

        src = _resolve_icon_source(fm, badge_id)
        if not src:
            continue

        im = _open_image(src)
        out_main = Path(str(CANON_ICON_FILE).format(id=badge_id))
        out_64 = Path(str(CANON_ICON_64_FILE).format(id=badge_id))

        _save_png(im, out_main)
        _save_png(_make_64(im), out_64)

        # rewrite frontmatter icon to canonical path
        fm["icon"] = CANON_ICON_PUBLIC.format(id=badge_id)
        new_md = _dump_front_matter(fm, body)
        if new_md != md:
            _write_text(md_path, new_md)
            changed += 1

    print(f"Normalised icons for {changed} badge markdown files.")


if __name__ == "__main__":
    main()
