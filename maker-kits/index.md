---
layout: splash
title: "Maker Kits"
classes: wide maker-kits-wide maker-kits-home-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<section class="mk-hero">
  <div>
    <p class="mk-kicker">Scout / community kit fundraiser</p>
    <h1>{{ mk.section.title }}</h1>
    <p class="mk-hero__intro">{{ mk.section.intro }}</p>
  </div>
</section>

<section class="mk-grid mk-grid--3 mk-next-links mk-next-links--top">
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/how-to-order/' | relative_url }}" target="_blank" rel="noopener">
    <h2>How ordering works</h2>
    <p>Batch ordering, packing options, what is included, what is not included, payment timing and delivery estimates.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/instructions/' | relative_url }}" target="_blank" rel="noopener">
    <h2>Instructions and support</h2>
    <p>Build guides, activity notes and example safety documents for planning a group session.</p>
  </a>
  <a class="mk-card mk-card--link" href="{{ '/maker-kits/map/' | relative_url }}" target="_blank" rel="noopener">
    <h2>Impact map</h2>
    <p>Public supporter names, repeat support and Scout districts reached by the project.</p>
  </a>
</section>

<section class="mk-card mk-order-status-card">
  <div>
    <p class="mk-kicker">Current ordering</p>
    {% if mk.ordering.orders_open == true %}
      <h2>{{ mk.ordering.status_label_open }}</h2>
      <p>{{ mk.ordering.open_note }}</p>
    {% else %}
      <h2>{{ mk.ordering.status_label_closed }}</h2>
      <p>{{ mk.ordering.closed_note }}</p>
    {% endif %}
    <p class="mk-muted"><strong>Lead time:</strong> {{ mk.ordering.delivery_estimate }}</p>
  </div>
  <div class="mk-order-status-card__actions">
    {% if mk.ordering.orders_open == true and mk.ordering.order_link and mk.ordering.order_link != "" %}
      <a class="btn btn--primary" href="{{ mk.ordering.order_link }}" target="_blank" rel="noopener">{{ mk.ordering.order_link_label }}</a>
    {% else %}
      <span class="mk-status-pill mk-status-pill--closed">Ordering closed</span>
    {% endif %}
    <a class="btn" href="{{ '/maker-kits/how-to-order/' | relative_url }}" target="_blank" rel="noopener">Read the ordering notes</a>
  </div>
</section>

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
            <div><dt>Price guide</dt><dd>{{ price.price }}</dd></div>
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
        <a class="btn" href="{{ '/maker-kits/how-to-order/' | relative_url }}" target="_blank" rel="noopener">Ordering notes</a>
      </div>
    </div>
  </article>
{% endfor %}
</div>

<section class="mk-card mk-price-card" id="price-list">
  <h2>{{ mk.price_list.title }}</h2>
  <p>{{ mk.price_list.note }}</p>

  <div class="mk-price-notes">
    <strong>Important:</strong>
    <ul>
      {% for note in mk.price_list.important %}<li>{{ note }}</li>{% endfor %}
    </ul>
  </div>

  <div class="mk-table-wrap">
    <table class="mk-price-table mk-price-table--tiers">
      <thead>
        <tr>
          <th>Discount</th>
          <th>Quantity</th>
          <th>I Can Solder</th>
          <th>Rocket</th>
          <th>Camp Fire</th>
        </tr>
      </thead>
      <tbody>
        {% for tier in mk.price_list.tiers %}
        <tr>
          <td>{{ tier.discount }}</td>
          <td>{{ tier.quantity }}</td>
          <td><span class="mk-price-lot">{{ tier.i_can_solder.lot }}</span><span class="mk-price-unit">{{ tier.i_can_solder.unit }} each</span></td>
          <td><span class="mk-price-lot">{{ tier.rocket.lot }}</span><span class="mk-price-unit">{{ tier.rocket.unit }} each</span></td>
          <td><span class="mk-price-lot">{{ tier.camp_fire.lot }}</span><span class="mk-price-unit">{{ tier.camp_fire.unit }} each</span></td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>
</section>
