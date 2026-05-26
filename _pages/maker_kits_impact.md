---
layout: single
title: "Maker Kits Public Impact"
permalink: /maker-kits/impact/
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-warning-card">
  <strong>Public data note:</strong> {{ mk.privacy.public_data_note }}
</div>

<div id="maker-kits-impact" class="mk-stat-grid" data-summary-url="{{ '/assets/data/maker_kits_impact_summary.json' | relative_url }}">
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="kits_supplied">—</span><span class="mk-stat-card__label">kits supplied</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="groups_supported">—</span><span class="mk-stat-card__label">groups / public map entries supported</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="postcode_districts_reached">—</span><span class="mk-stat-card__label">postcode districts reached</span></div>
  <div class="mk-stat-card"><span class="mk-stat-card__value" data-stat="batches_completed">—</span><span class="mk-stat-card__label">batches completed</span></div>
</div>

<p id="maker-kits-impact-note" class="mk-muted"></p>

## What these numbers mean

The public statistics are intended to show the broad reach of the project. They should not be used as a private order register.

Good public statistics include:

- total kits supplied
- groups, schools or clubs supported
- postcode districts reached
- batches completed
- estimated young people reached, if the assumption is clearly explained
- volunteer effort hours, if you are comfortable publishing them

## What is not published

The public impact page must not publish customer emails, contact names, full addresses, exact order rows, payment details, packing assignments, issue notes, tracking numbers or private operational data.

<script src="{{ '/assets/js/maker-kits-impact.js' | relative_url }}"></script>
