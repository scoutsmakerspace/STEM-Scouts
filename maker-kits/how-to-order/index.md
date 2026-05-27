---
layout: splash
title: "How to order Maker Kits"
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
    <p><strong>Order deadline:</strong> {{ mk.ordering.order_deadline }}</p>
    <p><strong>Lead time:</strong> {{ mk.ordering.delivery_estimate }}</p>
  </div>
  <div class="mk-order-status-card__actions">
    {% if mk.ordering.orders_open == true and mk.ordering.order_link and mk.ordering.order_link != "" %}
      <a class="btn btn--primary" href="{{ mk.ordering.order_link }}" target="_blank" rel="noopener">{{ mk.ordering.order_link_label }}</a>
    {% else %}
      <span class="mk-status-pill mk-status-pill--closed">Ordering closed</span>
    {% endif %}
    <a class="btn" href="{{ '/maker-kits/instructions/' | relative_url }}" target="_blank" rel="noopener">View instructions</a>
  </div>
</section>

## Before you order

Maker Kits are organised in batches rather than held as shop stock. Please check the current order window, price list, delivery estimate and packing approach before planning your activity date.

Before placing an order, check:

- which kit designs are currently available
- whether you need custom logo or writing on the PCB
- whether your order needs individual packing or labelled bulk bags
- whether your group has the tools, batteries, workspace and adult support needed for soldering
- the payment deadline and delivery estimate for the active batch

{% include maker-kits-price-list.html id="price-list" %}

## Packing approach

The packing approach is designed to reduce waste and keep costs as low as possible while still protecting the PCBs.

For orders under **125 pcs of the same design with the same logo/writing**:

- PCB sets are individually packed for protection
- the rest of the components are supplied in labelled bulk bags by component type

For orders over **125 pcs of the same design with the same logo/writing**:

- bulk packing is normally the most sensible option
- individual packing may still be possible if needed
- individual packing uses more plastic, although some cost can be offset through bulk buying

## Example: 50 Rocket badges

For example, if you order 50 Rocket badges, you would normally receive:

- 50 sets of the 2 PCBs, with each PCB set in its own protective bag
- 1 labelled bag with 50 red LEDs
- 1 labelled bag with 50 blue LEDs
- 1 labelled bag with 50 of one resistor type
- 1 labelled bag with 50 of the other resistor type
- 1 labelled bag with 150 nylon standoffs
- 1 labelled bag with 300 bolts, metal or nylon depending on the kit version

Once received, you can either pre-pack the kits before your session or distribute components directly at workstations. Use whichever approach works best for your group and helpers.

## What is included

Kits include the electronic components and fixings required for the kit build.

Tools and consumables are not included. Groups will normally need to provide:

- soldering irons
- solder
- side cutters
- safety glasses
- CR2032 batteries or other power items where required by the kit version
- a suitable workspace and adult supervision

## Payment, postage and delivery

{{ mk.ordering.payment_deadline_note }}

{{ mk.ordering.postage_note }}

{{ mk.ordering.delivery_estimate }}

For ordering or batch questions, contact: <a href="mailto:{{ mk.ordering.contact_email }}" target="_blank" rel="noopener">{{ mk.ordering.contact_email }}</a>.

## Instructions and safety planning

Build instructions and support documents are available here:

<p><a class="btn btn--primary" href="{{ '/maker-kits/instructions/' | relative_url }}" target="_blank" rel="noopener">Open the instruction documents</a></p>

The kits involve soldering or practical making. Leaders should prepare a suitable workspace, supervision plan and risk assessment for their own setting. The public documents are there to help, but they do not replace local safety planning.
