# Public Website Architecture — Maker Kits

## Goal

Add a public Maker Kits section to the existing STEM Scouts Jekyll website without exposing private order or packing data.

## Architecture

```text
Private Google Sheets / Apps Script packing tool
        |
        | controlled sanitised export only
        v
Public JSON / GeoJSON files in this website repo
        |
        v
Jekyll / GitHub Pages static website
```

The website must never read directly from the private spreadsheet. It should only consume reviewed public files committed to the repository.

## Public section URLs

- `/maker-kits/` — hub page
- `/maker-kits/how-to-order/` — ordering information
- `/maker-kits/instructions/` — public documents and build guides
- `/maker-kits/map/` — approximate public map
- `/maker-kits/impact/` — public statistics
- `/maker-kits/faq/` — FAQ and support notes

## Main files

- `_data/maker_kits.yml` — public-safe editable website content
- `maker-kits/index.md` and subfolder `index.md` files — public pages
- `assets/data/maker_kits_public_map.geojson` — public map data
- `assets/data/maker_kits_impact_summary.json` — public impact summary
- `assets/css/maker-kits.css` — page styling
- `assets/js/maker-kits-map.js` — public map loader
- `assets/js/maker-kits-impact.js` — public impact loader
- `tools/build_maker_kits_public_export.py` — local generator for public files
- `tools/validate_maker_kits_public_export.py` — basic leak checker for public JSON/GeoJSON files

## Safety rule

If a value helps contact, invoice, chase, pack, assign, troubleshoot or identify a private order, it must not be published.

## Public/private content split

Public pages should speak to leaders, schools, clubs, supporters and community groups. They should explain kits, ordering, instructions and broad impact.

Implementation notes, export rules, sanitisation logic and future product planning belong in repository documentation, not in the public visitor journey.
