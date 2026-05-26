#!/usr/bin/env python3
"""Build public-safe Maker Kits map/stat files from the current map CSV inputs.

The default output is the public supporter-map format:
- aggregates by postcode district centroid
- includes public Scout/group names only, not contact names
- removes emails, full addresses, full postcodes, payment, tracking, private notes and order-row data
- uses kit-count bands on the map, not exact per-group quantities
- keeps exact totals only in the high-level impact summary

Expected inputs:
  Region_report.csv with columns including Scout Group Name, District Code and Kits
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
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

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
            try:
                lat_f = float(_clean(row.get("Latitude")))
                lon_f = float(_clean(row.get("Longitude")))
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


def _read_region_report(path: Path) -> Tuple[Dict[str, Dict[str, Any]], int, int, int, int]:
    by_district: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "group_names": [],
        "kits_supplied": 0,
    })
    all_group_names: List[str] = []
    total_rows = 0
    total_kits = 0

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            district = _clean(row.get("District Code")).upper()
            if not district:
                continue
            group_name = _clean(row.get("Scout Group Name"))
            kits = _as_int(row.get("Kits"))
            if group_name:
                by_district[district]["group_names"].append(group_name)
                all_group_names.append(group_name)
            by_district[district]["kits_supplied"] += kits
            total_rows += 1
            total_kits += kits

    unique_groups = len(set(all_group_names))
    repeat_entries = max(0, total_rows - unique_groups)
    return dict(by_district), total_rows, total_kits, unique_groups, repeat_entries


def build(
    region_report: Path,
    postcode_districts: Path,
    out_geojson: Path,
    out_summary: Path,
    source_tool_version: str,
    include_group_names: bool,
) -> None:
    postcode_lookup = _read_postcode_lookup(postcode_districts)
    by_district, total_rows, total_kits, unique_groups, repeat_entries_total = _read_region_report(region_report)

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    features = []
    missing = []

    for district in sorted(by_district):
        loc = postcode_lookup.get(district)
        if not loc:
            missing.append(district)
            continue
        stats = by_district[district]
        names = [n for n in stats["group_names"] if n]
        counts = Counter(names)
        public_names = sorted(counts, key=lambda s: s.lower())
        unique_here = len(public_names)
        entries_here = len(names)
        repeat_here = max(0, entries_here - unique_here)
        town = loc.get("town_area") or loc.get("post_town") or f"{district} area"
        props = {
            "postcode_district": district,
            "display_area": town,
            "groups_supported": unique_here,
            "public_entries": entries_here,
            "repeat_entries": repeat_here,
            "kits_supplied_band": _kit_band(stats["kits_supplied"]),
        }
        if include_group_names:
            props["public_group_names"] = public_names
            props["group_details"] = [{"name": n, "entries": counts[n]} for n in public_names]

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]],
            },
            "properties": props,
        })

    privacy_level = "named_groups_no_contacts" if include_group_names else "aggregate_only"
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "schema_version": "1.1",
            "generated_at": now,
            "source_tool_version": source_tool_version,
            "location_precision": "postcode_district_centroid",
            "privacy_level": privacy_level,
            "private_fields_removed": True,
            "group_names_policy": "Group names are public supporter names only. No contact names, emails, full addresses, full postcodes, payment, tracking or order-row data is included.",
            "missing_postcode_districts": missing,
        },
        "features": features,
    }

    summary = {
        "schema_version": "1.1",
        "generated_at": now,
        "source_tool_version": source_tool_version,
        "privacy_level": privacy_level,
        "totals": {
            "kits_supplied": total_kits,
            "unique_groups_supported": unique_groups,
            "groups_supported": unique_groups,
            "public_entries": total_rows,
            "repeat_entries": repeat_entries_total,
            "postcode_districts_reached": len(features),
            "batches_completed": None,
            "estimated_young_people_reached": total_kits,
            "estimated_effort_hours": None,
        },
        "assumptions": {
            "groups_supported": "Unique public group names in the current public map source. Repeat entries are counted separately as returning/repeat support.",
            "public_entries": "Number of public source rows used to build the map. This may be higher than unique groups because some groups appear more than once.",
            "young_people_reached": "Placeholder estimate using one kit per young person. Adjust if your public reporting uses a different assumption.",
            "map_counts": "Map popups show kit bands rather than exact per-district or per-group quantities.",
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
    print(f"Unique groups: {unique_groups}; public entries: {total_rows}; repeat entries: {repeat_entries_total}; kits: {total_kits}")
    if missing:
        print("Warning: missing postcode districts:", ", ".join(missing))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region-report", default="Region_report.csv")
    parser.add_argument("--postcode-districts", default="Postcode_districts.csv")
    parser.add_argument("--out-geojson", default=str(ROOT / "assets/data/maker_kits_public_map.geojson"))
    parser.add_argument("--out-summary", default=str(ROOT / "assets/data/maker_kits_impact_summary.json"))
    parser.add_argument("--source-tool-version", default="V1.16.3")
    parser.add_argument("--hide-group-names", action="store_true", help="Generate an aggregate-only map with no public group names.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    build(
        region_report=Path(args.region_report),
        postcode_districts=Path(args.postcode_districts),
        out_geojson=Path(args.out_geojson),
        out_summary=Path(args.out_summary),
        source_tool_version=args.source_tool_version,
        include_group_names=not args.hide_group_names,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
