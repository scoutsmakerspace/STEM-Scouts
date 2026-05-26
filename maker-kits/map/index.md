---
layout: splash
title: "Maker Kits Map"
classes: wide
permalink: /maker-kits/map/
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

{% assign mk = site.data.maker_kits %}

<div class="mk-map-shell">
  <section class="mk-hero mk-map-intro">
    <p class="mk-kicker">Approximate public reach</p>
    <h1>Maker Kits map</h1>
    <p>{{ mk.privacy.map_note }}</p>
  </section>

  <div id="maker-kits-map" class="mk-map" data-geojson-url="{{ '/assets/data/maker_kits_public_map.geojson' | relative_url }}">
    <p>Loading public map…</p>
  </div>

  <p class="mk-muted">The map uses postcode-district centre points. It does not show customer names, contact details, full addresses or exact order locations.</p>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="{{ '/assets/js/maker-kits-map.js' | relative_url }}"></script>
