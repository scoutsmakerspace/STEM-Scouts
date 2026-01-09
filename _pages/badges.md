---
layout: single
title: "Badge Requirement Links"
permalink: /badges/
toc: true
---

This page links to official badge requirement pages / trusted references where available.

(We avoid copying requirement text so links stay current.)

{% include stem_badge_map.html %}

{% for section in site.data.badges %}
## {{ section.section_name }}

{% for b in section.badges %}
- **{{ b.badge }}** — {{ b.notes }} ([Link]({{ b.url }}))
{% endfor %}

{% endfor %}
