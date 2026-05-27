# Maker Kits public data source

This folder contains the public-safe source files used by GitHub Actions to rebuild the Maker Kits impact map.

For the full website maintenance checklist, see:

```text
docs/maker-kits-website-maintenance.md
```

## Main file to update after a batch

Replace this file when a batch is complete:

```text
assets/data/source/Region_report.csv
```

Keep the filename exactly as `Region_report.csv` so it matches the standalone Python map workflow as well.

Expected columns:

```text
Scout Group Name
Region Code
District Code
Scouts District Name
Kits
```

`District Code` is the manually verified public map postcode district. It must not come from a leader/customer delivery address unless that genuinely matches the group location.

`Scouts District Name` is used as the public organisational label on the map and supporter list.

Do not add private fields such as contact names, emails, phone numbers, addresses, full postcodes, payment details, tracking details or packing notes.

## Lookup file

`postcode_districts.csv` is the postcode-district centroid lookup used by the map builder. It only needs updating if a new postcode district is missing from the lookup.
