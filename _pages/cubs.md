---
layout: splash
title: "Cubs Activities"
permalink: /cubs/
toc: false
---

<div class="activities-intro">
  <p>
    Activities suitable for <strong>Cubs</strong>.
    Always review the activity and create your own Risk Assessment for your setting.
  </p>
</div>

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'cubs' or a.sections contains 'Cubs'"
  | sort: "title" %}
{% include activity_list.html items=items %}
