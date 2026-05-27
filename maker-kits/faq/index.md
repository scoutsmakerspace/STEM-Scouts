---
layout: splash
title: "Maker Kits FAQ and Support"
classes: wide maker-kits-wide maker-kits-content-page
toc: false
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/css/maker-kits-refinements.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<nav class="mk-subnav" aria-label="Maker Kits pages">
  <a href="{{ '/maker-kits/' | relative_url }}" target="_blank" rel="noopener">Overview</a>
  <a href="{{ '/maker-kits/how-to-order/' | relative_url }}" target="_blank" rel="noopener">Ordering</a>
  <a href="{{ '/maker-kits/instructions/' | relative_url }}" target="_blank" rel="noopener">Instructions</a>
  <a href="{{ '/maker-kits/map/' | relative_url }}" target="_blank" rel="noopener">Impact map</a>
  <a href="{{ '/maker-kits/faq/' | relative_url }}" target="_blank" rel="noopener">FAQ</a>
</nav>

{% for item in mk.faq %}
## {{ item.question }}

{{ item.answer }}

{% endfor %}

## Support requests

When asking for help with an order, include the kit type, approximate quantity, batch/order reference if you have one, and a clear description of the issue.

Please do not post private order details, addresses, payment information or personal contact details in public comments or on social media.
