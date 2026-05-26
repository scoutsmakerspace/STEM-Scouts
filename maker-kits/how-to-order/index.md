---
layout: single
title: "How to order Maker Kits"
toc: true
---

<link rel="stylesheet" href="{{ '/assets/css/maker-kits.css' | relative_url }}">

{% assign mk = site.data.maker_kits %}

<div class="mk-warning-card">
  <strong>Ordering status:</strong> {{ mk.ordering.status }}. {{ mk.ordering.contact_note }}
</div>

{% if mk.ordering.order_link and mk.ordering.order_link != "" %}
<p><a class="btn btn--primary" href="{{ mk.ordering.order_link }}">{{ mk.ordering.order_link_label }}</a></p>
{% endif %}

## Before you order

Maker Kits are normally organised as batch orders rather than a permanent shop. This helps keep the project practical, reduces waste and makes packing manageable for larger group orders.

Before placing an order, check:

- which kit designs are currently available
- whether you need individually packed kits or labelled bulk component bags
- whether you need custom logo or wording on the PCB
- the expected packing and dispatch window
- the current price list and postage process
- whether your group has enough adult support and equipment to run the activity safely

## Packing approach

Smaller orders may be supplied with PCBs individually bagged and the other components grouped in labelled bulk bags. Larger orders are usually easier and less wasteful to manage with bulk-packed components, unless individual packing has been agreed.

Each parcel should include a packing list so the receiving leader can check the contents before running a session.

## Payment and postage

Payment and postage are confirmed directly with the organiser. Postage is normally confirmed once parcels are packed and ready to send.

{{ mk.ordering.pricing_note }}

## Safety and session planning

The kits involve soldering or practical making. Leaders should prepare a suitable workspace, supervision plan and risk assessment for their own setting. Public instructions can help, but they do not replace local safety planning.

## Need help?

If something is missing or unclear, contact the organiser with the kit type, approximate quantity and a clear description of the issue. Avoid posting private order details, addresses or payment information in public comments or on social media.
