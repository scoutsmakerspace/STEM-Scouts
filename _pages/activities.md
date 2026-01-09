---
layout: splash
title: "All Activities"
permalink: /activities/
toc: false
classes: activities-index
---

<div class="activities-header">

  <div class="activities-intro">
    <p class="activities-intro__lead">
      A directory of STEM activities for UK Scouts. Each activity includes kit, notes, and links to example Risk Assessments.
      Leaders must review and create their own Risk Assessment for their setting.
    </p>
    <div class="section-quicklinks">
      <span class="section-quicklinks__label">Browse by section</span>
      <a class="section-chip section-chip--active" href="{{ '/activities/' | relative_url }}">All</a>
      <a class="section-chip" href="{{ '/squirrels/' | relative_url }}">Squirrels</a>
      <a class="section-chip" href="{{ '/beavers/' | relative_url }}">Beavers</a>
      <a class="section-chip" href="{{ '/cubs/' | relative_url }}">Cubs</a>
      <a class="section-chip" href="{{ '/scouts/' | relative_url }}">Scouts</a>
      <a class="section-chip" href="{{ '/explorers/' | relative_url }}">Explorers</a>
    </div>
  </div>

  {% include activity_filters.html %}

</div>

{% assign items = site.activities | sort: "title" %}
{% include activity_list.html items=items %}

<script src="{{ '/assets/js/activity-filters.js' | relative_url }}"></script>
