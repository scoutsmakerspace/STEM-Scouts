#!/usr/bin/env python3
"""
Normalize badge icons that were uploaded with arbitrary names into the canonical format.

- Source icons live in: assets/images/uploads/
- Badge records live in: _data/badges_catalog.yml
- A badge claims an uploaded file by setting:
    icon: /assets/images/uploads/<whatever>.png

This script will:
1) Copy the claimed upload to:
      assets/images/badges/<badge_id>.png
2) Move the original upload to:
      assets/images/uploads/_processed/<badge_id>__<original_filename>
3) Rewrite the badge icon field to the canonical path:
      /assets/images/badges/<badge_id>.png

It does NOT generate the 64px version; that is handled by the GitHub Action step.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Dict, List

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = REPO_ROOT / "_data" / "badges_catalog.yml"

UPLOADS_DIR = REPO_ROOT / "assets" / "images" / "uploads"
PROCESSED_DIR = UPLOADS_DIR / "_processed"
BADGES_DIR = REPO_ROOT / "assets" / "images" / "badges"


def _norm_icon_path(p: str) -> str:
    p = (p or "").strip()
    if not p:
        return ""
    if not p.startswith("/"):
        p = "/" + p
    return p


def main() -> int:
    if not CATALOG_PATH.exists():
        print(f"[normalise_badge_icons] Catalog not found: {CATALOG_PATH}")
        return 2

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    BADGES_DIR.mkdir(parents=True, exist_ok=True)

    data = yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8")) or {}
    badges: List[Dict[str, Any]] = data.get("badges") or []

    changed = False
    processed_any = False

    for b in badges:
        badge_id = (b.get("id") or "").strip()
        if not badge_id:
            continue

        icon_raw = b.get("icon", "")
        icon = _norm_icon_path(str(icon_raw)) if icon_raw is not None else ""
        if not icon:
            continue

        # Only process icons pointing at uploads
        if not icon.startswith("/assets/images/uploads/"):
            continue

        src_rel = icon.lstrip("/")  # repo-relative
        src_path = REPO_ROOT / src_rel
        if not src_path.exists():
            print(f"[normalise_badge_icons] WARNING: Icon source missing for {badge_id}: {src_rel}")
            continue

        if src_path.suffix.lower() != ".png":
            print(f"[normalise_badge_icons] WARNING: Not a .png, skipping for {badge_id}: {src_rel}")
            continue

        dst_path = BADGES_DIR / f"{badge_id}.png"
        processed_path = PROCESSED_DIR / f"{badge_id}__{src_path.name}"

        # Copy upload to canonical badge icon (overwrite)
        shutil.copy2(src_path, dst_path)

        # Move upload to processed (keep repo tidy)
        try:
            if processed_path.exists():
                processed_path.unlink()
            shutil.move(str(src_path), str(processed_path))
        except Exception as e:
            # Fall back to copy then delete
            try:
                shutil.copy2(src_path, processed_path)
                src_path.unlink()
            except Exception:
                print(f"[normalise_badge_icons] WARNING: Could not move/delete upload for {badge_id}: {e}")

        # Rewrite icon to canonical
        b["icon"] = f"/assets/images/badges/{badge_id}.png"
        changed = True
        processed_any = True
        print(f"[normalise_badge_icons] OK: {badge_id} <- {icon} -> /assets/images/badges/{badge_id}.png")

    if changed:
        out = dict(data)
        out["badges"] = badges
        CATALOG_PATH.write_text(
            yaml.safe_dump(out, sort_keys=False, allow_unicode=True, width=120),
            encoding="utf-8",
        )
        print("[normalise_badge_icons] Catalog updated.")

    if not processed_any:
        print("[normalise_badge_icons] Nothing to do.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
