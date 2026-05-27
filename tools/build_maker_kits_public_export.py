#!/usr/bin/env python3
"""Build public-safe Maker Kits map/stat files from the current public map CSV inputs.

This script is intentionally conservative:
- uses the manually verified map postcode district from Region_report.csv
- can include public group names for a supporter map
- can carry Scout District names from Region_report.csv where supplied
- removes contact names, emails, addresses, full postcodes, payments, order rows and private notes
- removes exact kit counts from map popups and uses bands instead
- writes exact totals only to the high-level impact summary

Supported Region_report.csv columns:
  Scout Group Name
  District Code                 # map postcode district, e.g. CV31
  Kits
  Scout District / Scout District Name / Scouts District / Scouts District Name / Scout District/Area
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
SCOUT_DISTRICT_COLUMNS = [
    "Scout District",
    "Scout District Name",
    "Scouts District",
    "Scouts District Name",
    "Scout District/Area",
]


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


def _get_scout_district(row: Dict[str, Any]) -> str:
    for col in SCOUT_DISTRICT_COLUMNS:
        value = _clean(row.get(col))
        if value:
            return value
    return ""


def _normalise_group_name(name: str) -> str:
    return " ".join(_clean(name).split())


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


def _read_region_report(path: Path) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Any]]:
    by_district: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "entries": 0,
        "kits_supplied": 0,
        "group_counter": Counter(),
        "group_scout_district_counter": defaultdict(Counter),
        "scout_district_counter": Counter(),
    })

    total_rows = 0
    total_kits = 0
    global_group_counter: Counter[str] = Counter()
    global_scout_district_counter: Counter[str] = Counter()
    missing_map_district_rows: List[int] = []
    missing_scout_district_rows: List[str] = []

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):
            district = _clean(row.get("District Code")).upper()
            if not district:
                missing_map_district_rows.append(idx)
                continue

            kits = _as_int(row.get("Kits"))
            group_name = _normalise_group_name(row.get("Scout Group Name"))
            scout_district = _get_scout_district(row)

            stats = by_district[district]
            stats["entries"] += 1
            stats["kits_supplied"] += kits

            if group_name:
                stats["group_counter"][group_name] += 1
                global_group_counter[group_name] += 1
                if scout_district:
                    stats["group_scout_district_counter"][group_name][scout_district] += 1

            if scout_district:
                stats["scout_district_counter"][scout_district] += 1
                global_scout_district_counter[scout_district] += 1
            elif group_name:
                missing_scout_district_rows.append(group_name)

            total_rows += 1
            total_kits += kits

    unique_groups = len(global_group_counter) if global_group_counter else total_rows
    returning_groups = sum(1 for count in global_group_counter.values() if count > 1)
    repeat_entries = sum(max(0, count - 1) for count in global_group_counter.values())

    totals = {
        "total_rows": total_rows,
        "total_kits": total_kits,
        "unique_groups": unique_groups,
        "returning_groups": returning_groups,
        "repeat_entries": repeat_entries,
        "unique_scout_districts": len(global_scout_district_counter),
        "missing_map_district_rows": missing_map_district_rows,
        "missing_scout_district_rows": missing_scout_district_rows,
    }
    return dict(by_district), totals


def _most_common_name(counter: Counter[str]) -> str:
    return counter.most_common(1)[0][0] if counter else ""


def build(region_report: Path, postcode_districts: Path, out_geojson: Path, out_summary: Path, source_tool_version: str, show_group_names: bool) -> None:
    postcode_lookup = _read_postcode_lookup(postcode_districts)
    by_district, totals = _read_region_report(region_report)

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    features: List[Dict[str, Any]] = []
    missing_postcode_districts: List[str] = []

    for district in sorted(by_district):
        loc = postcode_lookup.get(district)
        if not loc:
            missing_postcode_districts.append(district)
            continue

        stats = by_district[district]
        town = loc.get("town_area") or loc.get("post_town") or f"{district} area"
        group_counter: Counter[str] = stats["group_counter"]
        group_scout_district_counter: Dict[str, Counter[str]] = stats["group_scout_district_counter"]
        scout_district_counter: Counter[str] = stats["scout_district_counter"]
        scout_districts = sorted(scout_district_counter.keys(), key=str.lower)
        main_scout_district = _most_common_name(scout_district_counter)

        group_details: List[Dict[str, Any]] = []
        if show_group_names:
            for name, count in sorted(group_counter.items(), key=lambda item: item[0].lower()):
                detail: Dict[str, Any] = {"name": name, "entries": count}
                per_group_district_counter = group_scout_district_counter.get(name, Counter())
                if per_group_district_counter:
                    per_group_districts = sorted(per_group_district_counter.keys(), key=str.lower)
                    detail["scout_district"] = _most_common_name(per_group_district_counter)
                    if len(per_group_districts) > 1:
                        detail["scout_districts"] = per_group_districts
                group_details.append(detail)

        groups_supported = len(group_counter) if group_counter else stats["entries"]
        properties: Dict[str, Any] = {
            "postcode_district": district,
            "display_area": town,
            "groups_supported": groups_supported,
            "public_entries": stats["entries"],
            "repeat_entries": max(0, stats["entries"] - groups_supported),
            "kits_supplied_band": _kit_band(stats["kits_supplied"]),
        }
        if main_scout_district:
            properties["scout_district"] = main_scout_district
        if scout_districts:
            properties["scout_districts"] = scout_districts
        if show_group_names:
            properties["public_group_names"] = [g["name"] for g in group_details]
            properties["group_details"] = group_details

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]],
            },
            "properties": properties,
        })

    privacy_level = "public_group_names" if show_group_names else "aggregate_only"
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "schema_version": "1.2",
            "generated_at": now,
            "source_tool_version": source_tool_version,
            "location_precision": "postcode_district_centroid",
            "privacy_level": privacy_level,
            "private_fields_removed": True,
            "missing_postcode_districts": missing_postcode_districts,
            "scout_district_column_supported": True,
        },
        "features": features,
    }

    summary = {
        "schema_version": "1.2",
        "generated_at": now,
        "source_tool_version": source_tool_version,
        "privacy_level": privacy_level,
        "totals": {
            "kits_supplied": totals["total_kits"],
            "unique_groups_supported": totals["unique_groups"],
            "public_support_entries": totals["total_rows"],
            "returning_groups": totals["returning_groups"],
            "repeat_entries": totals["repeat_entries"],
            "postcode_districts_reached": len(features),
            "scout_districts_reached": totals["unique_scout_districts"],
            "batches_completed": None,
            "estimated_young_people_reached": totals["total_kits"],
            "estimated_effort_hours": None,
        },
        "assumptions": {
            "unique_groups_supported": "Unique public group names counted from the public map source. Review before publishing.",
            "public_support_entries": "Rows in the public map source; repeat groups are counted separately here.",
            "returning_groups": "Unique public group names with more than one entry.",
            "scout_districts_reached": "Unique Scout district names supplied in Region_report.csv.",
            "young_people_reached": "Placeholder estimate using one kit per young person. Adjust if your public reporting uses a different assumption.",
            "map_counts": "Map popups use kit bands, not exact per-district or per-group kit quantities.",
        },
        "warnings": {
            "missing_postcode_districts": missing_postcode_districts,
            "missing_map_district_rows": totals["missing_map_district_rows"],
            "missing_scout_district_rows": totals["missing_scout_district_rows"],
        },
    }

    out_geojson.parent.mkdir(parents=True, exist_ok=True)
    out_summary.parent.mkdir(parents=True, exist_ok=True)
    out_geojson.write_text(json.dumps(geojson, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    out_summary.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out_geojson} ({len(features)} map features)")
    print(f"Wrote {out_summary}")
    if missing_postcode_districts:
        print("Warning: missing postcode districts:", ", ".join(missing_postcode_districts))
    if totals["missing_scout_district_rows"]:
        print("Warning: rows missing Scout district:", len(totals["missing_scout_district_rows"]))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region-report", default="Region_report.csv")
    parser.add_argument("--postcode-districts", default="Postcode_districts.csv")
    parser.add_argument("--out-geojson", default=str(ROOT / "assets/data/maker_kits_public_map.geojson"))
    parser.add_argument("--out-summary", default=str(ROOT / "assets/data/maker_kits_impact_summary.json"))
    parser.add_argument("--source-tool-version", default="V1.16.3")
    parser.add_argument("--hide-group-names", action="store_true", help="Generate aggregate-only public map data.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    build(
        region_report=Path(args.region_report),
        postcode_districts=Path(args.postcode_districts),
        out_geojson=Path(args.out_geojson),
        out_summary=Path(args.out_summary),
        source_tool_version=args.source_tool_version,
        show_group_names=not args.hide_group_names,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
