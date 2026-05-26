---
layout: single
title: "How to order Maker Kits"
permalink: /maker-kits/how-to-order/
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

These kits are normally organised as a batch fundraiser/community project rather than a shop-style stock system. That means order windows, prices and delivery timing may change between batches.

Before placing an order, check:

- which kit designs are currently available
- whether the order is for individually packed kits or bulk-packed components
- whether you need custom logo/writing on the PCB
- the expected packing and dispatch window
- the current price list and postage process
- whether your group has enough adult support and equipment to run the activity safely

## Packing approach

For smaller orders, PCBs may be individually bagged while components are supplied in labelled bulk bags by component type. Larger orders may use bulk packing unless individual packing is agreed.

This reduces unnecessary packaging and makes larger group orders more practical. The parcel should include a packing list so the receiving leader can check the contents.

## Payment and postage

Payment and postage details should be handled directly through the organiser and should not be published through this public website.

{{ mk.ordering.pricing_note }}

## Safety and session planning

The kits involve soldering or practical making. Leaders should prepare a suitable workspace, supervision plan and risk assessment for their own setting. Public instructions can help, but they do not replace local safety planning.

## Private order data

The website does not provide public order lookup. Customer emails, contact names, full addresses, payment details, issue records and packing assignments stay in the private operational tool.
