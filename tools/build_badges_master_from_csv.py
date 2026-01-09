#!/usr/bin/env python3
"""Build `_data/badges_master.json` from the badge CSV exports.

Why this exists
The Scout badge CSV exports store *all* requirements inside a single cell which
contains headings, optional groups, and numbered items. A naive split leads to:
- duplicated numbers with different text
- lost option headings
- broken CMS retention (because requirement IDs change)

This script:
- reads `tools/badge_sources/*_Badges.csv`
- converts each badge into a structured object
- writes `_data/badges_master.json` (list of badge dicts)

Requirement model (per badge)
- Each entry is either:
  - kind: "heading"  (text only)
  - kind: "req"      (id + text + optional meta)

For Decap (badge_link widget), requirement checkboxes use `id`, so IDs must be:
- unique *within a badge*
- stable across regenerations

ID strategy
- If requirements are inside a named group (e.g. "Meteorology:") and the number
  restarts at 1, the ID becomes: "Meteorology 1".
- If no group, the ID is just the number: "1".
- For decimal numbers like 1.1, the ID is "1.1" (or "Group 1.1").

Usage
  python tools/build_badges_master_from_csv.py
  python tools/generate_badges.py
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "tools" / "badge_sources"
OUT_JSON = ROOT / "_data" / "badges_master.json"

# map filename prefix -> section slug
SECTION_FROM_FILE = {
    "Squirrels": "squirrels",
    "Beavers": "beavers",
    "Cubs": "cubs",
    "Scouts": "scouts",
    "Explorers": "explorers",
    "Universal": "staged",  # displayed as Staged (not Universal)
}


def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)


HEADING_ONLY_RE = re.compile(
    r"^(complete|choose|mandatory|optional|you must|you need|you should|evidence)\b",
    re.IGNORECASE,
)

GROUP_RE = re.compile(r"^(.+?):\s*$")

# 1. ...  / 1) ... / 1 - ...
NUM_RE = re.compile(r"^(\d+(?:\.\d+)*)(?:\.|\)|\-|\:)?\s+(.*)$")


def normalise_badge_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip())


def split_lines(cell: str) -> List[str]:
    if cell is None:
        return []
    # CSV already decodes newlines as '\n' inside cell
    text = str(cell).replace("\r\n", "\n").replace("\r", "\n")
    lines = [l.strip() for l in text.split("\n")]
    # keep empty lines as separators? we drop them
    return [l for l in lines if l]


def parse_requirements(req_cell: str) -> List[Dict[str, str]]:
    """Parse the CSV requirements cell into a structured list.

    Returns a list of dicts:
      {"kind":"heading","text":"Meteorology"}
      {"kind":"req","id":"Meteorology 1","no":"1","text":"..."}

    Notes
    - Continuation lines (wrapped text) are appended to the previous requirement.
    - Headings include group labels and instruction lines.
    """

    lines = split_lines(req_cell)
    out: List[Dict[str, str]] = []
    current_group: Optional[str] = None
    last_req_idx: Optional[int] = None

    def add_heading(text: str) -> None:
        nonlocal current_group, last_req_idx
        text = text.strip().rstrip(":")
        if not text:
            return
        out.append({"kind": "heading", "text": text})
        last_req_idx = None

    def add_req(num: str, text: str) -> None:
        nonlocal last_req_idx
        num = num.strip()
        text = text.strip()
        if not text:
            return
        rid = f"{current_group} {num}" if current_group else num
        out.append({"kind": "req", "id": rid, "no": num, "text": text})
        last_req_idx = len(out) - 1

    for raw in lines:
        s = raw.strip()
        if not s:
            continue

        # Group headings like "Meteorology:" / "Radio Communications:" etc
        m = GROUP_RE.match(s)
        if m and not NUM_RE.match(s):
            grp = m.group(1).strip()
            # treat special headings (MANDATORY/OPTIONAL etc.) as headings but not as group
            if HEADING_ONLY_RE.match(grp):
                current_group = None
                add_heading(grp)
            else:
                current_group = grp
                add_heading(grp)
            continue

        # Instruction headings that aren't groups
        if HEADING_ONLY_RE.match(s) and not NUM_RE.match(s):
            current_group = None
            add_heading(s)
            continue

        # Numbered requirement
        m = NUM_RE.match(s)
        if m:
            num = m.group(1)
            txt = m.group(2).strip()
            add_req(num, txt)
            continue

        # Continuation line: append to previous requirement if possible
        if last_req_idx is not None and out[last_req_idx].get("kind") == "req":
            out[last_req_idx]["text"] = (out[last_req_idx]["text"] + " " + s).strip()
        else:
            # fallback: treat as a heading (keeps content visible)
            add_heading(s)

    # De-duplicate exact duplicate requirement lines within a badge
    seen = set()
    cleaned: List[Dict[str, str]] = []
    for item in out:
        key = (item.get("kind"), item.get("id"), item.get("text"))
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(item)

    return cleaned


def section_title(section_slug: str) -> str:
    # Display labels
    if section_slug == "staged":
        return "Staged"
    return section_slug.capitalize()


def main() -> None:
    if not SOURCES_DIR.exists():
        raise SystemExit(f"Missing sources directory: {SOURCES_DIR}")

    all_badges: List[Dict] = []

    for csv_path in sorted(SOURCES_DIR.glob("*_Badges.csv")):
        # file prefix e.g. Beavers_Badges.csv
        prefix = csv_path.name.split("_")[0]
        section = SECTION_FROM_FILE.get(prefix)
        if not section:
            print(f"Skipping unknown badge source file: {csv_path.name}")
            continue

        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                badge_name = normalise_badge_name(row.get("Badge Name", ""))
                if not badge_name:
                    continue

                category = (row.get("Category") or "").strip()
                btype = (row.get("Type") or "").strip()
                description = (row.get("Description") or "").strip()
                completion_rules = (row.get("Completion Rules") or "").strip()
                req_cell = row.get("Requirements") or ""

                bid = slugify(f"{section}-{badge_name}")

                reqs = parse_requirements(req_cell)

                # Ensure requirement IDs are unique even if a file has weird duplicates
                used = set()
                for item in reqs:
                    if item.get("kind") != "req":
                        continue
                    rid = item.get("id") or ""
                    if rid not in used:
                        used.add(rid)
                        continue
                    # append suffixes a,b,c...
                    base = rid
                    i = 2
                    while True:
                        cand = f"{base} ({i})"
                        if cand not in used:
                            item["id"] = cand
                            used.add(cand)
                            break
                        i += 1

                all_badges.append(
                    {
                        "id": bid,
                        "badge_name": badge_name,
                        "section": section,
                        "section_label": section_title(section),
                        "category": category,
                        "type": btype,
                        "description": description,
                        "completion_rules": completion_rules,
                        "requirements": reqs,
                    }
                )

    # Sort stable
    all_badges.sort(key=lambda b: (b.get("section", ""), b.get("badge_name", "")))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(all_badges, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {OUT_JSON} ({len(all_badges)} badges)")


if __name__ == "__main__":
    main()
