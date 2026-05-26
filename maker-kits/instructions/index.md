---
layout: single
title: "Maker Kit Instructions and Documents"
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

The current public build guides and leader documents are stored in the instructions folder below. Please check that you are using the latest version for your kit batch before printing or running a session.

<p><a class="btn btn--primary" href="{{ mk.instructions.drive_folder_url }}">{{ mk.instructions.drive_folder_label }}</a></p>

<div class="mk-warning-card">
  <strong>Session safety:</strong> soldering activities need suitable adult supervision, safety glasses, a sensible workspace and a local risk assessment.
</div>

<div class="mk-doc-list">
{% for doc in mk.documents %}
  <article class="mk-card mk-doc-card">
    <h2>{{ doc.title }}</h2>
    <p><strong>Type:</strong> {{ doc.type }}</p>
    {% if doc.version and doc.version != "" %}<p><strong>Version:</strong> {{ doc.version }}</p>{% endif %}
    {% if doc.date and doc.date != "" %}<p><strong>Date:</strong> {{ doc.date }}</p>{% endif %}
    {% if doc.file and doc.file != "" %}
      <p><a class="btn btn--primary" href="{{ doc.file }}">Open</a></p>
    {% else %}
      <p class="mk-muted">Download not added yet.</p>
    {% endif %}
  </article>
{% endfor %}
</div>

## Suggested document set

The public instructions folder should eventually include:

- build instructions for each kit
- leader notes for running a session
- soldering safety briefing
- troubleshooting sheet
- packing/content checklist for receiving groups
- optional youth worksheet or reflection sheet

## Version control

Put a version and date on each public document. When a kit changes, update the document and the public page together so leaders do not use old instructions with new parts.
