---
layout: splash
title: "Example Risk Assessments"
permalink: /risk-assessments/
toc: false
classes: wide ra-index
---

<div class="ra-index-intro">
  <p class="ra-index-warning">
    <strong>Important:</strong> These Risk Assessments are <strong>examples and reference material only</strong>.
    Leaders must review and create their own Risk Assessment suitable for their activity, section, location, equipment, and supervision.
    They <strong>must not be copied or reused without review</strong>.
  </p>
</div>

{% assign ras = site.risk_assessments | sort: "title" %}
{% include ra_list.html items=ras %}
