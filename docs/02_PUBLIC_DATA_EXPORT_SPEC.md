# Public Data Export Specification — Maker Kits

## Purpose

Define the public files that can be safely committed to the website repository.

## Public files

### `assets/data/maker_kits_impact_summary.json`

Contains only aggregate public statistics.

Allowed fields include:

- total kits supplied
- total groups / public map entries supported
- postcode districts reached
- batches completed
- estimated young people reached, if the assumption is explained
- generated date
- source tool version
- privacy level

### `assets/data/maker_kits_public_map.geojson`

Contains approximate map features by postcode district centroid.

Allowed map properties:

- postcode district, such as `CV31`
- broad display area
- count of groups supported in that postcode district
- banded kit count, such as `50-99`
- generated metadata

Do not include full postcodes, addresses, contact names, emails, payment information, order rows or private notes.

## Recommended low-level map privacy

For each postcode district, publish banded kit counts rather than exact quantities:

- `1-24`
- `25-49`
- `50-99`
- `100-249`
- `250-499`
- `500+`

## Future Apps Script export

The Google Sheets / Apps Script tool should eventually generate a public export preview first. The user should review that preview before any file is published to the website repository.
