---
layout: splash
title: "Beavers Activities"
permalink: /beavers/
toc: false
---

<div class="activities-intro">
  <p>
    Activities suitable for <strong>Beavers</strong>.
    Always review the activity and create your own Risk Assessment for your setting.
  </p>
</div>

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'beavers' or a.sections contains 'Beavers'"
  | sort: "title" %}
{% include activity_list.html items=items %}
