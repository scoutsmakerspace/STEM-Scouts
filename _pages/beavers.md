---
layout: single
title: "Beavers STEM Activities"
permalink: /beavers/
toc: true
---

{% comment %}
NOTE: Liquid's `where_exp` does NOT allow filters inside the expression
(so you can't do `a.sections | join` / `| downcase` there).

Because `sections` is stored as an ARRAY in each activity's front matter,
we can match directly using `contains`.
{% endcomment %}

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'Beavers'"
  | sort: "title" %}
{% include activity_list.html items=items %}

