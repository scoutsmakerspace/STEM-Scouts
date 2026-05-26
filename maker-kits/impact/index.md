---
layout: single
title: "Maker Kits Impact"
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-warning-card">
  <strong>Public summary:</strong> {{ mk.privacy.public_data_note }}
</div>

<div id="maker-kits-impact" class="mk-stat-grid mk-stat-grid--six" data-summary-url="{{ '/assets/data/maker_kits_impact_summary.json' | relative_url }}">
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="kits_supplied">—</span><span class="mk-stat-card__label">kits supplied</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="groups_supported">—</span><span class="mk-stat-card__label">unique groups supported</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="public_map_entries">—</span><span class="mk-stat-card__label">order / map entries</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="returning_group_entries">—</span><span class="mk-stat-card__label">repeat entries</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="postcode_districts_reached">—</span><span class="mk-stat-card__label">postcode districts reached</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="estimated_young_people_reached">—</span><span class="mk-stat-card__label">estimated young people reached</span></div>
</div>

<p id="maker-kits-impact-note" class="mk-muted"></p>

## Why the numbers are separated

Some groups have ordered more than once. To keep the public figures honest, the impact page separates:

- **unique groups supported** — each group counted once
- **order / map entries** — the number of public source entries used for the map and totals
- **repeat entries** — extra entries from groups that appear more than once
- **postcode districts reached** — broad geographic areas reached, not exact addresses

This means the numbers do add up: repeat entries are included in the order/map entry count, but they do not inflate the unique group count.

## What is not published

The public impact page does not publish customer emails, contact names, full addresses, exact order rows, payment details, packing assignments, issue notes, tracking numbers or private operational data.

<script src="{{ '/assets/js/maker-kits-impact.js' | relative_url }}"></script>
