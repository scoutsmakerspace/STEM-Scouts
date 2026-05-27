# Maker Kits public website maintenance

This page is the working checklist for updating the public Maker Kits pages.

The public repo is visible to everyone. Only publish information you would be happy for a member of the public, a parent, a Scout leader, or a search engine to see.

## 1. Updating the impact map after a batch

The public map is generated from:

```text
assets/data/source/Region_report.csv
```

At the end of a batch:

1. Update `Region_report.csv` locally.
2. Check that it only contains public-safe fields.
3. Upload/replace this file in the repo:

   ```text
   assets/data/source/Region_report.csv
   ```

4. Commit to `main`.
5. GitHub Actions will run automatically.
6. Check that the workflow finishes successfully.
7. Check the public map page.

Expected columns:

```text
Scout Group Name
Region Code
District Code
Scouts District Name
Kits
```

`District Code` is the manually checked postcode district used for the map marker. Do not use the order/delivery postcode unless it genuinely matches the group’s public location.

`Scouts District Name` is the public Scout district label shown on the map and supporter list.

Do not add contact names, emails, phone numbers, addresses, full postcodes, payment data, delivery details, tracking details, packing notes, or private issue notes to this CSV.

## 2. Updating the postcode lookup

The postcode lookup is:

```text
assets/data/source/postcode_districts.csv
```

Normally this should not change. Update it only if the build fails because a new postcode district is missing.

## 3. Opening or closing orders

Ordering is controlled in:

```text
_data/maker_kits.yml
```

To open ordering, change:

```yaml
orders_open: false
```

to:

```yaml
orders_open: true
```

To close ordering, change it back to:

```yaml
orders_open: false
```

When orders are open, also check:

```yaml
order_link
order_link_label
open_note
order_deadline
payment_deadline_note
delivery_estimate
postage_note
```

The order button only appears when `orders_open` is set to `true`.

## 4. Updating the Google Form link

The form link is stored here:

```yaml
ordering:
  order_link: "..."
```

Use the full Google Forms link if needed. A long link is fine.

Current field:

```yaml
order_link: "https://docs.google.com/forms/d/e/1FAIpQLScluP5gHF1V9YUD6fFruxkhKF9VGdKraecJWKs5ZW4BvHZwcA/viewform?usp=sharing&ouid=100348817326081150191"
```

## 5. Updating the order message

The message shown when ordering is closed is:

```yaml
closed_note: >-
  ...
```

The message shown when ordering is open is:

```yaml
open_note: >-
  ...
```

Keep the public message short. Put detailed packing and payment information on the How to order page unless it is specific to that batch.

## 6. Updating the price list

The current price table is stored in:

```yaml
price_list:
```

The important sections are:

```yaml
important:
items:
tiers:
```

The public table treats the lot price as the main price, because groups normally order and pay for lots.

## 7. Updating instruction PDFs

Current PDFs live in:

```text
docs/instructions/
```

After replacing or adding a PDF, update the relevant entry in:

```yaml
documents:
```

and, if needed, the relevant kit entry:

```yaml
kits:
  instructions_url:
```

## 8. If the workflow fails

Check the failing step in GitHub Actions.

If `Build Maker Kits public data` fails, the most likely causes are:

- `Region_report.csv` is missing
- a required column name changed
- a row has a blank postcode district
- a row has a blank Scout district
- a postcode district is missing from `postcode_districts.csv`
- the validator found something private-looking in the generated public files

Fix the source CSV, commit again, and let the workflow rerun.
