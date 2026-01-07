---
layout: single
title: "Example Risk Assessments"
permalink: /risk-assessments/
toc: true
---

## About these Risk Assessments

The Risk Assessments listed on this page are **examples and reference material only**.

They are provided to help leaders identify common hazards and possible control measures.
They **must not be copied or reused without review**.

Leaders are responsible for creating and approving a Risk Assessment appropriate to their
own activity, section, location, equipment, and supervision.

---

{% assign ras = site.risk_assessments | sort: "next_review" %}
{% include ra_list.html items=ras %}
