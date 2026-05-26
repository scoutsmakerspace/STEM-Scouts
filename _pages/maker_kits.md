---
layout: splash
title: "Maker Kits"
permalink: /maker-kits/
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<section class="mk-hero">
  <div>
    <p class="mk-kicker">Scout / community kit fundraiser</p>
    <h1>{{ mk.section.title }}</h1>
    <p class="mk-hero__intro">{{ mk.section.intro }}</p>
    <div class="mk-actions">
      <a class="btn btn--primary" href="{{ mk.section.primary_cta_url | relative_url }}">{{ mk.section.primary_cta_label }}</a>
      <a class="btn" href="{{ mk.section.secondary_cta_url | relative_url }}">{{ mk.section.secondary_cta_label }}</a>
    </div>
  </div>
</section>

<section class="mk-warning-card">
  <strong>Public data boundary:</strong> this website section is designed to use only sanitised public information.
  The private Google Sheets / Apps Script packing tool remains the operational back end.
</section>

<section class="mk-grid mk-grid--3">
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/how-to-order/' | relative_url }}">
    <h2>How to order</h2>
    <p>Explain batch ordering, pricing notes, packing options and what happens after an order is placed.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/instructions/' | relative_url }}">
    <h2>Instructions</h2>
    <p>Keep build guides, safety notes and leader documents in one public place.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/impact/' | relative_url }}">
    <h2>Impact</h2>
    <p>Show safe aggregated totals such as kits supplied, groups supported and postcode districts reached.</p>
  </a>
</section>

## Kits

<div class="mk-kit-grid">
{% for kit in mk.kits %}
  <article class="mk-kit-card" id="{{ kit.slug }}">
    {% if kit.image and kit.image != "" %}
      <img class="mk-kit-card__image" src="{{ kit.image | relative_url }}" alt="{{ kit.name }}">
    {% endif %}
    <div class="mk-kit-card__body">
      <h2>{{ kit.name }}</h2>
      <p>{{ kit.short_description }}</p>
      <dl class="mk-meta-list">
        <div><dt>Difficulty</dt><dd>{{ kit.difficulty }}</dd></div>
        <div><dt>Build time</dt><dd>{{ kit.build_time }}</dd></div>
      </dl>
      <h3>Skills</h3>
      <ul>
      {% for skill in kit.skills %}<li>{{ skill }}</li>{% endfor %}
      </ul>
      {% if kit.instructions_url and kit.instructions_url != "" %}
        <a class="btn btn--primary" href="{{ kit.instructions_url | relative_url }}">Download instructions</a>
      {% else %}
        <p class="mk-muted">Instructions link to be added.</p>
      {% endif %}
    </div>
  </article>
{% endfor %}
</div>

## Public map and statistics

<div class="mk-grid mk-grid--2">
  <div class="mk-card">
    <h2>Public map</h2>
    <p>{{ mk.privacy.map_note }}</p>
    <p><a class="btn" href="{{ '/maker-kits/map/' | relative_url }}">Open the map</a></p>
  </div>
  <div class="mk-card">
    <h2>Public impact</h2>
    <p>{{ mk.privacy.public_data_note }}</p>
    <p><a class="btn" href="{{ '/maker-kits/impact/' | relative_url }}">View impact statistics</a></p>
  </div>
</div>
