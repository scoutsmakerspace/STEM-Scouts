---
layout: single
title: "Cubs STEM Activities"
permalink: /cubs/
toc: true
---

{% comment %}
Liquid's `where_exp` does NOT allow filters inside the expression.
`sections` is an array, so match directly.
{% endcomment %}

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'Cubs'"
  | sort: "title" %}
{% include activity_list.html items=items %}
