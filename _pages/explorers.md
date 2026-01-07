---
layout: splash
title: "Explorers Activities"
permalink: /beavers/
toc: false
---

<div class="activities-intro">
  <p>
    Activities suitable for <strong>Explorers</strong>.
    Always review the activity and create your own Risk Assessment for your setting.
  </p>
</div>

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'explorers' or a.sections contains 'Explorers'"
  | sort: "title" %}
{% include activity_list.html items=items %}
