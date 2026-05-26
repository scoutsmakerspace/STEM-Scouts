#!/usr/bin/env python3
"""Build public-safe Maker Kits map/stat files from the current map CSV inputs.

This script is intentionally conservative:
- aggregates by postcode district
- removes Scout group names from the public map
- removes exact kit counts from map popups and uses bands instead
- writes exact totals only to the high-level impact summary

Expected inputs:
  Region_report.csv with columns including District Code and Kits
  Postcode_districts.csv with columns including Postcode, Latitude, Longitude, Town/Area

Example:
  python tools/build_maker_kits_public_export.py \
    --region-report Region_report.csv \
    --postcode-districts Postcode_districts.csv
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

ROOT = Path(__file__).resolve().parents[1]


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _as_int(value: Any) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return 0


def _kit_band(n: int) -> str:
    if n <= 0:
        return "not shown"
    if n < 25:
        return "1-24"
    if n < 50:
        return "25-49"
    if n < 100:
        return "50-99"
    if n < 250:
        return "100-249"
    if n < 500:
        return "250-499"
    return "500+"


def _read_postcode_lookup(path: Path) -> Dict[str, Dict[str, Any]]:
    lookup: Dict[str, Dict[str, Any]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = _clean(row.get("Postcode")).upper()
            if not code:
                continue
            lat = _clean(row.get("Latitude"))
            lon = _clean(row.get("Longitude"))
            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except Exception:
                continue
            lookup[code] = {
                "latitude": lat_f,
                "longitude": lon_f,
                "town_area": _clean(row.get("Town/Area")),
                "uk_region": _clean(row.get("UK region")),
                "post_town": _clean(row.get("Post Town")),
            }
    return lookup


def _read_region_report(path: Path) -> Tuple[Dict[str, Dict[str, int]], int, int]:
    by_district: Dict[str, Dict[str, int]] = defaultdict(lambda: {"groups_supported": 0, "kits_supplied": 0})
    total_rows = 0
    total_kits = 0
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            district = _clean(row.get("District Code")).upper()
            if not district:
                continue
            kits = _as_int(row.get("Kits"))
            by_district[district]["groups_supported"] += 1
            by_district[district]["kits_supplied"] += kits
            total_rows += 1
            total_kits += kits
    return dict(by_district), total_rows, total_kits


def build(region_report: Path, postcode_districts: Path, out_geojson: Path, out_summary: Path, source_tool_version: str) -> None:
    postcode_lookup = _read_postcode_lookup(postcode_districts)
    by_district, total_rows, total_kits = _read_region_report(region_report)

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    features = []
    missing = []

    for district in sorted(by_district):
        loc = postcode_lookup.get(district)
        if not loc:
            missing.append(district)
            continue
        stats = by_district[district]
        town = loc.get("town_area") or loc.get("post_town") or f"{district} area"
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]],
            },
            "properties": {
                "postcode_district": district,
                "display_area": town,
                "groups_supported": stats["groups_supported"],
                "kits_supplied_band": _kit_band(stats["kits_supplied"]),
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "schema_version": "1.0",
            "generated_at": now,
            "source_tool_version": source_tool_version,
            "location_precision": "postcode_district_centroid",
            "privacy_level": "aggregate_only",
            "private_fields_removed": True,
            "missing_postcode_districts": missing,
        },
        "features": features,
    }

    summary = {
        "schema_version": "1.0",
        "generated_at": now,
        "source_tool_version": source_tool_version,
        "privacy_level": "aggregate_only",
        "totals": {
            "kits_supplied": total_kits,
            "groups_supported": total_rows,
            "postcode_districts_reached": len(features),
            "batches_completed": None,
            "estimated_young_people_reached": total_kits,
            "estimated_effort_hours": None,
        },
        "assumptions": {
            "groups_supported": "Counted from public map source rows. Review if the same group appears in multiple rows.",
            "young_people_reached": "Placeholder estimate using one kit per young person. Adjust if your public reporting uses a different assumption.",
            "map_counts": "Map popups use kit bands, not exact per-district kit quantities.",
        },
        "warnings": {
            "missing_postcode_districts": missing,
        },
    }

    out_geojson.parent.mkdir(parents=True, exist_ok=True)
    out_summary.parent.mkdir(parents=True, exist_ok=True)
    out_geojson.write_text(json.dumps(geojson, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    out_summary.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out_geojson} ({len(features)} map features)")
    print(f"Wrote {out_summary}")
    if missing:
        print("Warning: missing postcode districts:", ", ".join(missing))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region-report", default="Region_report.csv")
    parser.add_argument("--postcode-districts", default="Postcode_districts.csv")
    parser.add_argument("--out-geojson", default=str(ROOT / "assets/data/maker_kits_public_map.geojson"))
    parser.add_argument("--out-summary", default=str(ROOT / "assets/data/maker_kits_impact_summary.json"))
    parser.add_argument("--source-tool-version", default="V1.16.3")
    args = parser.parse_args(list(argv) if argv is not None else None)

    build(
        region_report=Path(args.region_report),
        postcode_districts=Path(args.postcode_districts),
        out_geojson=Path(args.out_geojson),
        out_summary=Path(args.out_summary),
        source_tool_version=args.source_tool_version,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
