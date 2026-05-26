---
layout: splash
title: "Maker Kits Public Impact"
classes: wide maker-kits-wide
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<section class="mk-hero">
  <p class="mk-kicker">Public impact</p>
  <h1>What the Maker Kits project has supported</h1>
  <p class="mk-hero__intro">These figures show the broad public reach of the Maker Kits project. They are deliberately public-safe: no private contact details, addresses, payments, tracking information or order rows are published.</p>
</section>

<div id="maker-kits-impact" class="mk-stat-grid" data-summary-url="{{ '/assets/data/maker_kits_impact_summary.json' | relative_url }}">
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="kits_supplied">—</span><span class="mk-stat-card__label">kits supplied</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="unique_groups_supported">—</span><span class="mk-stat-card__label">unique groups supported</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="public_entries">—</span><span class="mk-stat-card__label">public support entries</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="postcode_districts_reached">—</span><span class="mk-stat-card__label">postcode districts reached</span></div>
</div>

<p id="maker-kits-impact-note" class="mk-muted"></p>

## Why entries and groups are different

A group can appear more than once if they have supported or ordered through the project more than once. For that reason, the impact page separates **unique groups supported** from **public support entries**.

This avoids overstating the number of separate groups while still recognising returning supporters.

## What is not published

The public impact page does not publish customer emails, named contacts, full addresses, full postcodes, exact order rows, payment details, packing assignments, private issue notes or tracking numbers.

## Assumptions used

<ul id="maker-kits-impact-assumptions"></ul>

<script src="{{ '/assets/js/maker-kits-impact.js' | relative_url }}"></script>
