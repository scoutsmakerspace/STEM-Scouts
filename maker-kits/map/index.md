---
layout: splash
title: "Maker Kits Impact Map"
classes: wide maker-kits-wide maker-kits-map-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-refinements.css' | relative_url }}">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css">

<div class="mk-map-dashboard">
  <nav class="mk-subnav" aria-label="Maker Kits pages">
    <a href="{{ '/maker-kits/' | relative_url }}" target="_blank" rel="noopener">Overview</a>
    <a href="{{ '/maker-kits/how-to-order/' | relative_url }}" target="_blank" rel="noopener">Ordering</a>
    <a href="{{ '/maker-kits/instructions/' | relative_url }}" target="_blank" rel="noopener">Instructions</a>
    <a href="{{ '/maker-kits/map/' | relative_url }}" target="_blank" rel="noopener">Impact map</a>
    <a href="{{ '/maker-kits/faq/' | relative_url }}" target="_blank" rel="noopener">FAQ</a>
  </nav>

  <div class="mk-map-page-title">
    <p class="mk-kicker">Public impact map</p>
    <h1>Where Maker Kits have reached</h1>
    <p>This map brings the project’s public impact statistics and supporter map together in one place.</p>
  </div>

  <div class="mk-map-summary" aria-label="Maker Kits public impact summary">
    <div class="mk-mini-stat"><span id="mk-map-stat-groups" class="mk-mini-stat__value">—</span><span class="mk-mini-stat__label">unique groups supported</span></div>
    <div class="mk-mini-stat"><span id="mk-map-stat-entries" class="mk-mini-stat__value">—</span><span class="mk-mini-stat__label">public support entries</span></div>
    <div class="mk-mini-stat"><span id="mk-map-stat-repeat" class="mk-mini-stat__value">—</span><span class="mk-mini-stat__label">repeat entries</span></div>
    <div class="mk-mini-stat"><span id="mk-map-stat-scout-districts" class="mk-mini-stat__value">—</span><span class="mk-mini-stat__label">Scout districts listed</span></div>
  </div>

  <div class="mk-map-toolbar">
    <input id="maker-kits-map-search" class="mk-map-search" type="search" placeholder="Search group name, Scout district, postcode district, town or area…" aria-label="Search public impact map">
    <button id="maker-kits-clear-search" class="mk-map-button" type="button">Clear search</button>
    <button id="maker-kits-reset-map" class="mk-map-button" type="button">Reset map</button>
    <button id="maker-kits-toggle-list" class="mk-map-button" type="button">Show/hide list</button>
  </div>

  <div class="mk-map-legend">
    <span><i class="mk-legend-dot"></i>postcode district marker</span>
    <span><i class="mk-legend-dot mk-legend-dot--repeat"></i>area with repeat support</span>
    <span><i class="mk-legend-dot mk-legend-dot--cluster"></i>clustered markers when zoomed out</span>
  </div>

  <div class="mk-map-layout">
    <div class="mk-map-shell">
      <div id="maker-kits-map" class="mk-map" data-geojson-url="{{ '/assets/data/maker_kits_public_map.geojson' | relative_url }}">
        <p>Loading public impact map…</p>
      </div>
    </div>

    <aside class="mk-map-side-panel" aria-label="Public supporter list">
      <div class="mk-map-panel-head">
        <h2>Public supporter list</h2>
        <p class="mk-muted">Search or click a supporter to zoom to their approximate area.</p>
      </div>
      <div id="maker-kits-group-list" class="mk-map-list"></div>
    </aside>
  </div>

</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script src="{{ '/assets/js/maker-kits-map.js' | relative_url }}"></script>
