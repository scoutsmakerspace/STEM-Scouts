---
layout: single
title: "Badge Requirement Links"
permalink: /badges/
toc: true
---

This page links to official badge requirement pages / trusted references where available.

*Looking for STEM ideas?* Try the **STEM Badge Mapping** page: [Open STEM Badge Mapping]({{ "/badges/stem-map/" | relative_url }}).

(We avoid copying requirement text so links stay current.)

{% for section in site.data.badges %}
## {{ section.section_name }}

{% for b in section.badges %}
- **{{ b.badge }}** — {{ b.notes }} ([Link]({{ b.url }}))
{% endfor %}

{% endfor %}
