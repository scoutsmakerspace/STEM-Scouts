---
layout: splash
title: "Maker Kits"
classes: wide maker-kits-wide maker-kits-content-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-refinements.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-hotfix.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-content-shell" markdown="1">

<section class="mk-hero">
  <div>
    <p class="mk-kicker">Scout / community kit fundraiser</p>
    <h1>{{ mk.section.title }}</h1>
    <p class="mk-hero__intro">{{ mk.section.intro }}</p>
  </div>
</section>

<section class="mk-grid mk-grid--3 mk-next-links mk-next-links--top">
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/how-to-order/' | relative_url }}">
    <h2>How ordering works</h2>
    <p>Batch ordering, packing options, what is included, what is not included, payment timing and delivery estimates.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/instructions/' | relative_url }}">
    <h2>Instructions and support</h2>
    <p>Build guides, activity notes and example safety documents for planning a group session.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/map/' | relative_url }}">
    <h2>Impact map</h2>
    <p>Public supporter names, repeat support and Scout districts reached by the project.</p>
  </a>
</section>

{% include maker-kits-order-status.html %}

## Kits

<p class="mk-section-intro">The kits are intended for supervised group sessions. They include the electronic components and fixings needed for the build, but not tools, batteries or delivery.</p>

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
        {% for price in mk.price_list.items %}
          {% if price.kit_slug == kit.slug %}
            <div><dt>Lot price guide</dt><dd>{{ price.price }}<br><span class="mk-muted">{{ price.unit }}</span></dd></div>
          {% endif %}
        {% endfor %}
      </dl>
      <h3>Skills</h3>
      <ul>
      {% for skill in kit.skills %}<li>{{ skill }}</li>{% endfor %}
      </ul>
      <div class="mk-card-actions">
        {% if kit.instructions_url and kit.instructions_url != "" %}
          <a class="btn btn--primary" href="{{ kit.instructions_url | relative_url }}" target="_blank" rel="noopener">Instructions</a>
        {% endif %}
        <a class="btn" href="{{ '/maker-kits/how-to-order/' | relative_url }}">Ordering notes</a>
      </div>
    </div>
  </article>
{% endfor %}
</div>

{% include maker-kits-price-list.html %}

</div>
