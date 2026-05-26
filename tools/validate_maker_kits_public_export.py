#!/usr/bin/env python3
"""Check Maker Kits public export files for obvious private-data leaks."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Iterable, List, Tuple

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?:\+44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}")
FULL_UK_POSTCODE_RE = re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b", re.I)
BANNED_KEYWORDS = [
    "email", "contact", "phone", "address", "payment", "paid", "invoice", "row", "order_row",
    "issue", "assignment", "tracking", "parcel", "label", "notes", "postcode_full", "full_postcode",
]


def walk(obj: Any, path: str = "") -> Iterable[Tuple[str, Any]]:
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{path}.{k}" if path else str(k)
            yield p, v
            yield from walk(v, p)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            p = f"{path}[{i}]"
            yield p, v
            yield from walk(v, p)


def validate(path: Path) -> List[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    problems: List[str] = []

    for p, v in walk(data):
        leaf = p.split(".")[-1].lower()
        for banned in BANNED_KEYWORDS:
            if banned in leaf:
                problems.append(f"{path}: banned-looking key at {p}")
        if isinstance(v, str):
            if EMAIL_RE.search(v):
                problems.append(f"{path}: possible email address at {p}")
            if PHONE_RE.search(v):
                problems.append(f"{path}: possible UK mobile number at {p}")
            if FULL_UK_POSTCODE_RE.search(v):
                problems.append(f"{path}: possible full UK postcode at {p}")
    return problems


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", default=[
        "assets/data/maker_kits_public_map.geojson",
        "assets/data/maker_kits_impact_summary.json",
    ])
    args = parser.parse_args(list(argv) if argv is not None else None)

    all_problems: List[str] = []
    for f in args.files:
        path = Path(f)
        if not path.exists():
            all_problems.append(f"Missing file: {path}")
            continue
        all_problems.extend(validate(path))

    if all_problems:
        print("Public export validation FAILED:")
        for problem in all_problems:
            print("-", problem)
        return 1

    print("Public export validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
