---
layout: single
title: "Beavers STEM Activities"
permalink: /beavers/
toc: true
---

{% assign items = site.activities | where_exp: "a", "a.sections contains 'Beavers'" | sort: "title" %}
{% include activity_list.html items=items %}

