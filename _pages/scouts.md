---
layout: single
title: "Scouts STEM Activities"
permalink: /scouts/
toc: true
---

{% assign items = site.activities
  | where_exp: "a", "a.sections and (a.sections | join: ',' | downcase) contains 'scouts'"
  | sort: "title" %}
{% include activity_list.html items=items %}
