---
layout: splash
title: "All Activities"
permalink: /activities/
classes: activities-index
---
<div class="activities-intro">
  <p>
    This page lists all STEM activities shared on this site.
    Each activity includes a quick overview, kit list, and links to supporting resources where available.
    Leaders must review the activity and create their own Risk Assessment suitable for their section, location, and supervision.
  </p>

<div class="section-quicklinks">
  <span class="section-quicklinks__label">Browse by section:</span>

  <a class="section-chip section-chip--active"
     href="{{ '/activities/' | relative_url }}">
     All
  </a>

  <a class="section-chip" href="{{ '/beavers/' | relative_url }}">Beavers</a>
  <a class="section-chip" href="{{ '/cubs/' | relative_url }}">Cubs</a>
  <a class="section-chip" href="{{ '/scouts/' | relative_url }}">Scouts</a>
  <a class="section-chip" href="{{ '/explorers/' | relative_url }}">Explorers</a>
</div>

</div>

{% assign items = site.activities | sort: "title" %}
{% include activity_filters.html %}
{% include activity_list.html items=items %}
<script src="{{ '/assets/js/activity-filters.js' | relative_url }}"></script>
