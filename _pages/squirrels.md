---
layout: splash
title: "Squirrels Activities"
permalink: /squirrels/
toc: false
---

<div class="activities-intro">
  <p>
    Activities suitable for <strong>Squirrels</strong>.
    Always review the activity and create your own Risk Assessment for your setting.
  </p>
</div>

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'squirrels' or a.sections contains 'Squirrels'"
  | sort: "title" %}
{% include activity_list.html items=items %}
