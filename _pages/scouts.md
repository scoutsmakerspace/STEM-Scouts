---
layout: splash
title: "Scouts Activities"
permalink: /scouts/
toc: false
---

<div class="activities-intro">
  <p>
    Activities suitable for <strong>Scouts</strong>.
    Always review the activity and create your own Risk Assessment for your setting.
  </p>
</div>

{% assign items = site.activities
  | where_exp: "a", "a.sections contains 'scouts' or a.sections contains 'Scouts'"
  | sort: "title" %}
{% include activity_list.html items=items %}
