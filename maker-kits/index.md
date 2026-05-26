---
layout: splash
title: "Maker Kits"
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
  <strong>Community fundraiser:</strong> these kits are produced in batches to support practical STEM activities for young people. Orders are handled directly with groups, schools and community organisations.
</section>

<section class="mk-grid mk-grid--3">
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/how-to-order/' | relative_url }}">
    <h2>How to order</h2>
    <p>Find out how batch ordering works, what to check before ordering, and how packing and postage are normally handled.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/instructions/' | relative_url }}">
    <h2>Instructions</h2>
    <p>Download build guides, leader notes, safety reminders and troubleshooting documents for the kits.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/map/' | relative_url }}">
    <h2>Impact map</h2>
    <p>See where Maker Kits have reached, including public supporter names, repeat support and postcode districts reached.</p>
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
        <a class="btn btn--primary" href="{{ kit.instructions_url }}">Download instructions</a>
      {% else %}
        <p class="mk-muted">Instructions link to be added.</p>
      {% endif %}
    </div>
  </article>
{% endfor %}
</div>

## Public reach

<div class="mk-grid mk-grid--2">
  <div class="mk-card">
    <h2>Impact map</h2>
    <p>Public supporter names and broad reach statistics are shown together on the impact map. Locations are approximate and shown by postcode district, not exact address.</p>
    <p><a class="btn" href="{{ '/maker-kits/map/' | relative_url }}">Open the impact map</a></p>
  </div>
  <div class="mk-card">
    <h2>Instructions and support</h2>
    <p>Build guides, safety notes and support information are kept together so leaders can plan sessions confidently.</p>
    <p><a class="btn" href="{{ '/maker-kits/instructions/' | relative_url }}">Open the instructions</a></p>
  </div>
</div>
