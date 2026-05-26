---
layout: single
title: "Maker Kits FAQ and Support"
permalink: /maker-kits/faq/
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

{% for item in mk.faq %}
## {{ item.question }}

{{ item.answer }}

{% endfor %}

## Support requests

When asking for help with an order, include the kit type, approximate quantity, batch/order reference if you have one, and a clear description of the issue.

Do not post private order details, addresses, payment information or personal contact details in public comments or on social media.
