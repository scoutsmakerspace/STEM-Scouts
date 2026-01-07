---
layout: splash
title: "All Activities"
permalink: /activities/
---

{% assign items = site.activities | sort: "title" %}
{% include activity_list.html items=items %}
