---
layout: splash
title: "Maker Kit Instructions"
classes: wide maker-kits-wide maker-kits-content-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-refinements.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-hotfix.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-content-shell" markdown="1">

<h1>Maker Kit Instructions</h1>

{% include maker-kits-subnav.html %}

<p>Build guides and support documents for running Maker Kit sessions are kept here so leaders can find the latest public versions in one place.</p>

<div class="mk-doc-list mk-doc-list--grid">
{% for doc in mk.documents %}
  <article class="mk-card mk-doc-card">
    <h2>{{ doc.title }}</h2>
    <p><strong>Type:</strong> {{ doc.type }}</p>
    {% if doc.version and doc.version != "" %}<p><strong>Version:</strong> {{ doc.version }}</p>{% endif %}
    {% if doc.date and doc.date != "" %}<p><strong>Date:</strong> {{ doc.date }}</p>{% endif %}
    {% if doc.file and doc.file != "" %}
      <p><a class="btn btn--primary" href="{{ doc.file | relative_url }}" target="_blank" rel="noopener">Download PDF</a></p>
    {% else %}
      <p class="mk-muted">Download not added yet.</p>
    {% endif %}
  </article>
{% endfor %}
</div>

## Planning a session

Before running a kit session, leaders should check:

- the correct build guide for the kit version being used
- component quantities against the packing list
- soldering irons, solder, side cutters, batteries and safety glasses
- adult supervision and workstation layout
- local risk assessment and safety briefing

## Notes

The documents are intended to support planning and delivery. They do not replace local supervision, safety planning or group-specific risk assessment.

</div>
