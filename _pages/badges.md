---
layout: splash
title: "Badge Requirement Links"
permalink: /badges/
toc: false
classes: wide stem-badge-page
---

<link rel="stylesheet" href="{{ '/assets/css/stem-badge-map.css' | relative_url }}">

This page links to official badge requirement pages / trusted references where available.

(We avoid copying requirement text so links stay current.)

---

## STEM badge requirement map

{% include stem_badge_map.html %}

---

## Official links

{% for section in site.data.badges %}
## {{ section.section_name }}

{% for b in section.badges %}
- **{{ b.badge }}** — {{ b.notes }} ([Link]({{ b.url }}))
{% endfor %}

{% endfor %}
