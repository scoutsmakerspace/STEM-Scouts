---
layout: single
title: "Maker Kits Public Map"
permalink: /maker-kits/map/
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQvh9cK64fQkT9dIkq4hFf0kG3QH1Xk=" crossorigin="">

{% assign mk = site.data.maker_kits %}

<div class="mk-warning-card">
  <strong>Privacy note:</strong> {{ mk.privacy.map_note }}
</div>

<div id="maker-kits-map" class="mk-map" data-geojson-url="{{ '/assets/data/maker_kits_public_map.geojson' | relative_url }}">
  <p>Loading public map…</p>
</div>

<p class="mk-muted">The map is generated from sanitised public export data. It uses postcode district centroids, not exact addresses.</p>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script src="{{ '/assets/js/maker-kits-map.js' | relative_url }}"></script>
