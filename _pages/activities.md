---
layout: splash
title: "All Activities"
permalink: /activities/
classes: activities-index
---
<div class="activities-intro">

<p>
This page lists all available STEM activities shared on this site. Each activity includes an overview,
equipment list, and links to example Risk Assessments and supporting resources where available.
Leaders should review each activity and create their own Risk Assessment suitable for their section,
location, and supervision.
</p>

<p>
Use the section links in the menu to browse activities suitable for Beavers, Cubs, Scouts, and Explorers.
</p>

</div>


{% assign items = site.activities | sort: "title" %}
{% include activity_list.html items=items %}

