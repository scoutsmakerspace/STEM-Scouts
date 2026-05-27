Maker Kits map update - Scout District Name support
===================================================

This patch updates the public Maker Kits impact map to use the new Scouts District Name column in Region_report.csv.

Upload the CONTENTS of copy_to_repo into the root of the STEM-Scouts GitHub repo.
Do not upload the copy_to_repo folder itself.

Main changes
------------

- assets/data/maker_kits_public_map.geojson
  Updated public map data generated from the uploaded Region_report.csv.

- assets/data/maker_kits_impact_summary.json
  Updated public impact totals.

- tools/build_maker_kits_public_export.py
  Updated builder that recognises:
  Scout District
  Scout District Name
  Scouts District
  Scouts District Name
  Scout District/Area

- maker-kits/map/index.md
  Adds Scout districts listed as a public impact stat.

- assets/js/maker-kits-map.js
  Shows Scout district under group names in the right-hand supporter list and in popups.

- assets/css/maker-kits.css
  Adjusts the summary cards to fit the added Scout district statistic.

Current totals from the uploaded Region_report.csv
--------------------------------------------------

- Kits supplied: 8,915
- Unique groups supported: 124
- Public support entries: 129
- Returning groups: 5
- Repeat entries: 5
- Postcode districts reached: 114
- Scout districts listed: 100

Notes
-----

Region_report.csv itself should not be committed to the public repo unless you deliberately decide to publish it.
The public website only needs the generated JSON/GeoJSON files under assets/data/.
