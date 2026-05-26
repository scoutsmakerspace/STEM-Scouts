---
layout: single
title: "Maker Kit Instructions and Documents"
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

Build guides, leader notes and printable documents are collected here for groups running Maker Kit sessions.

{% if mk.instructions.folder_url and mk.instructions.folder_url != "" %}
<div class="mk-warning-card">
  <strong>Instruction PDFs:</strong> {{ mk.instructions.folder_note }}
  <p><a class="btn btn--primary" href="{{ mk.instructions.folder_url }}">{{ mk.instructions.folder_label }}</a></p>
</div>
{% endif %}

<div class="mk-doc-list">
{% for doc in mk.documents %}
  <article class="mk-card mk-doc-card">
    <h2>{{ doc.title }}</h2>
    <p><strong>Type:</strong> {{ doc.type }}</p>
    {% if doc.version and doc.version != "" %}<p><strong>Version:</strong> {{ doc.version }}</p>{% endif %}
    {% if doc.date and doc.date != "" %}<p><strong>Date:</strong> {{ doc.date }}</p>{% endif %}
    {% if doc.file and doc.file != "" %}
      <p><a class="btn btn--primary" href="{{ doc.file }}">Open</a></p>
    {% endif %}
  </article>
{% endfor %}
</div>

## Before running a session

Please check the latest instructions before your session, especially if your kits were ordered in a different batch. Small component or PCB changes can affect the build order.

Useful documents include:

- build instructions for each kit
- leader notes for running a session
- soldering safety briefing
- troubleshooting notes
- packing/content checklist for receiving groups
- optional youth worksheets or reflection sheets
