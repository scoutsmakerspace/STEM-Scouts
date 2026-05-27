---
layout: splash
title: "Maker Kits FAQ and Support"
classes: wide maker-kits-wide maker-kits-content-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-refinements.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-hotfix.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-content-shell" markdown="1">

<h1>Maker Kits FAQ and Support</h1>

{% include maker-kits-subnav.html %}

<div class="mk-faq-list">
{% for item in mk.faq %}
  <section class="mk-card mk-faq-card">
    <h2>{{ item.question }}</h2>
    <p>{{ item.answer }}</p>
  </section>
{% endfor %}
</div>

<section class="mk-card mk-support-card">
  <h2>Support requests</h2>
  <p>When asking for help with an order, include the kit type, approximate quantity, batch/order reference if you have one, and a clear description of the issue.</p>
  <p>Please do not post private order details, addresses, payment information or personal contact details in public comments or on social media.</p>
</section>

</div>
