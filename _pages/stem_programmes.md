---
layout: single
title: "STEM Programmes"
permalink: /stem-programmes/
toc: true
---

Many great STEM opportunities already exist within Scouts, often run in partnership with external organisations.
This page is a growing directory of programmes and resources leaders may want to explore.

> **Note:** Always check the official source for the latest requirements and availability.  
> Items marked **Wider youth STEM programme** are not run by Scouts — leaders should review suitability, safeguarding, and requirements before use.

{% assign items = site.stem_programmes %}

## National / UK-wide programmes
{% assign group = items | where: "category", "national" | sort: "title" %}
{% include stem_programmes_list.html items=group %}

## Radio & space
{% assign group = items | where: "category", "radio_space" | sort: "title" %}
{% include stem_programmes_list.html items=group %}

## Digital skills & coding
{% assign group = items | where: "category", "digital_coding" | sort: "title" %}
{% include stem_programmes_list.html items=group %}

## Environment & science
{% assign group = items | where: "category", "environment_science" | sort: "title" %}
{% include stem_programmes_list.html items=group %}

## Other
{% assign group = items | where: "category", "other" | sort: "title" %}
{% include stem_programmes_list.html items=group %}

## Suggest a programme
If you know a programme that should be listed here, add it via the CMS (recommended) or via a GitHub PR.