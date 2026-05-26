---
layout: single
title: "Maker Kit Instructions and Documents"
permalink: /maker-kits/instructions/
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

These public documents are for leaders and helpers running kit sessions. Add final PDF downloads under `assets/docs/maker-kits/` and then update `_data/maker_kits.yml`.

<div class="mk-doc-list">
{% for doc in mk.documents %}
  <article class="mk-card mk-doc-card">
    <h2>{{ doc.title }}</h2>
    <p><strong>Type:</strong> {{ doc.type }}</p>
    {% if doc.version and doc.version != "" %}<p><strong>Version:</strong> {{ doc.version }}</p>{% endif %}
    {% if doc.date and doc.date != "" %}<p><strong>Date:</strong> {{ doc.date }}</p>{% endif %}
    {% if doc.file and doc.file != "" %}
      <p><a class="btn btn--primary" href="{{ doc.file | relative_url }}">Download</a></p>
    {% else %}
      <p class="mk-muted">Download not added yet.</p>
    {% endif %}
  </article>
{% endfor %}
</div>

## Suggested document set

- build instructions for each kit
- leader notes for running a session
- soldering safety briefing
- troubleshooting sheet
- packing/content checklist for receiving groups
- optional youth worksheet or reflection sheet

## Version control

Put a version and date on each public document. When a kit changes, update the document and the public data file together so leaders do not use old instructions with new parts.
