---
layout: single
title: "Cubs STEM Activities"
permalink: /cubs/
toc: true
---

{% assign items = site.activities | where_exp: "a", "a.sections and (a.sections | join: ',' | downcase) contains 'cubs'" | sort: "title" %}
{% include activity_list.html items=items %}
