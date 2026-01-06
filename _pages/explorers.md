---
layout: single
title: "Explorers STEM Activities"
permalink: /explorers/
toc: true
---

{% assign items = site.activities
  | where_exp: "a", "a.sections and (a.sections | join: ',' | downcase) contains 'explorers'"
  | sort: "title" %}
{% include activity_list.html items=items %}
