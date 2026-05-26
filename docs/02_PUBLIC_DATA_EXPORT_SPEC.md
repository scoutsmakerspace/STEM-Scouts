# Public Data Export Specification — Maker Kits

## Purpose

Define the public files that can be safely committed to the website repository.

## Public files

### `assets/data/maker_kits_impact_summary.json`

Contains only aggregate public statistics.

Allowed fields include:

- total kits supplied
- unique groups supported
- public map / order entries
- repeat entries from groups that have ordered more than once
- postcode districts reached
- batches completed, if known
- estimated young people reached, if the assumption is explained
- generated date
- source tool version
- privacy level

### `assets/data/maker_kits_public_map.geojson`

Contains approximate map features by postcode district centroid.

Allowed map properties:

- postcode district, such as `CV31`
- broad display area
- count of unique groups supported in that postcode district
- count of public map / order entries in that postcode district
- repeat entry count, if any
- banded kit count, such as `50-99`
- generated metadata

Do not include full postcodes, addresses, contact names, emails, payment information, raw order rows, private issue notes or packing assignments.

## Recommended low-level map privacy

For each postcode district, publish banded kit counts rather than exact quantities:

- `1-24`
- `25-49`
- `50-99`
- `100-249`
- `250-499`
- `500+`

## Number definitions

- **Unique groups supported**: each group name counted once from the private source export before names are removed from public files.
- **Public map / order entries**: source rows used for the public export. This can be higher than the number of unique groups because some groups order more than once.
- **Repeat entries**: public map / order entries minus unique groups supported.
- **Postcode districts reached**: postcode districts with at least one public map entry.

For the current public export, the numbers are:

- 8,915 kits supplied
- 124 unique groups supported
- 131 public map / order entries
- 7 repeat entries
- 114 postcode districts reached

## Future Apps Script export

The Google Sheets / Apps Script tool should eventually generate a public export preview first. The user should review that preview before any file is published to the website repository.
