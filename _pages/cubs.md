---
layout: single
title: "Cubs STEM Activities"
permalink: /cubs/
toc: true
---

{% assign items = site.activities | where_exp: "a", "a.sections contains 'Cubs'" | sort: "title" %}
{% include activity_list.html items=items %}
