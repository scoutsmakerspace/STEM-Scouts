# Maker Kits website maintenance

This page is for maintaining the public Maker Kits pages on the STEM Scouts website.

The public repo is public. Only upload information you are happy for visitors and search engines to see.

## Main files

### Public page content

Most public wording, ordering settings, kit details and prices are controlled here:

```text
_data/maker_kits.yml
```

### Public map source

After a batch, replace this file:

```text
assets/data/source/Region_report.csv
```

Keep the filename exactly as `Region_report.csv`.

Expected columns:

```text
Scout Group Name
Region Code
District Code
Scouts District Name
Kits
```

`District Code` is the manually verified public map postcode district. Do not use a leader/customer delivery postcode unless it genuinely matches the group location.

`Scouts District Name` is shown publicly as the Scout district label on the supporter list and map popup.

Do not add private fields such as contact names, emails, phone numbers, addresses, full postcodes, payment details, tracking details or packing notes.

## Updating the impact map

1. Update your safe `Region_report.csv` locally.
2. Upload/replace:

```text
assets/data/source/Region_report.csv
```

3. Commit to `main`.
4. GitHub Actions will run automatically.
5. The workflow generates:

```text
assets/data/maker_kits_public_map.geojson
assets/data/maker_kits_impact_summary.json
```

6. Check the deployed map:

```text
https://stemscouts.space/maker-kits/map/
```

If the workflow fails, open the failed run and check the “Build Maker Kits public data” step first. Strict mode usually fails because a postcode district or Scout district is missing from the CSV.

## Opening and closing the order form

Edit:

```text
_data/maker_kits.yml
```

Find:

```yaml
ordering:
  orders_open: false
```

Set to `true` when orders are open:

```yaml
ordering:
  orders_open: true
```

Set back to `false` when the order window closes.

The form URL is here:

```yaml
order_link: "https://docs.google.com/forms/d/e/..."
```

External order form links open in a new tab. Internal Maker Kits page links stay in the same tab.

## Updating the ordering message

Still in `_data/maker_kits.yml`, update these fields:

```yaml
closed_note: >-
  Orders are taken in batches. The ordering form will be linked from this page when the next batch opens.

open_note: >-
  Please read the packing, payment, price and delivery notes before submitting the order form.

order_deadline: "To be confirmed for the next batch"

delivery_estimate: "7–8 weeks from order close, unless stated otherwise for the current batch."
```

Normal order windows are described with:

```yaml
batch_cycle_note: >-
  Batch orders are usually organised twice a year, around spring and autumn.
```

Large-order guidance is described with:

```yaml
large_order_note: >-
  Larger orders can be discussed separately, especially for camps, district activities or whole-district orders.
```

## Updating prices

Prices are also in:

```text
_data/maker_kits.yml
```

Update the `price_list:` section.

The public table is generated from:

```yaml
price_list:
  tiers:
```

The headline kit-card prices are generated from:

```yaml
price_list:
  items:
```

The same shared include is used on both the overview page and the ordering page:

```text
_includes/maker-kits-price-list.html
```

So the two pages should show the same price table.

## Updating instruction PDFs

The current instruction PDFs are stored here:

```text
docs/instructions/
```

The public links are listed in:

```yaml
documents:
```

inside `_data/maker_kits.yml`.

When replacing a PDF, either keep the same filename or update the relevant `file:` value.

## Useful pages to check after changes

```text
https://stemscouts.space/maker-kits/
https://stemscouts.space/maker-kits/how-to-order/
https://stemscouts.space/maker-kits/instructions/
https://stemscouts.space/maker-kits/map/
https://stemscouts.space/maker-kits/faq/
```
