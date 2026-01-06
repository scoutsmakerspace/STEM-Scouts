---
layout: single
title: "Explorers STEM Activities"
permalink: /explorers/
toc: true
---

{% assign items = site.activities | where_exp: "a", "a.sections contains 'Explorers'" | sort: "title" %}
{% include activity_list.html items=items %}
