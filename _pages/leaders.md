---
layout: single
title: "Leaders & Safety"
permalink: /leaders/
toc: true
---

## Risk Assessments (Index)
{% assign ras = site.risk_assessments | sort: "next_review" %}
{% include ra_list.html items=ras %}

## Important: Risk Assessments on this site

The Risk Assessments provided on this site are **examples and starting points only**.

They are **not** intended to be copied, reused, or relied on without review.

### Your responsibility as a leader
- You must **review and adapt** any example Risk Assessment to your own activity.
- You must consider your **section, location, equipment, numbers, and supervision**.
- You are responsible for creating and approving a Risk Assessment that is suitable for your local context and follows current Scouts guidance.

Even if two activities look similar, **risk assessments are not transferable without review**.

### How to use the example Risk Assessments
1. Read the example Risk Assessment linked to an activity.
2. Use it to identify common hazards and control measures.
3. Adapt or recreate it for your own setting.
4. Review it with your leadership team as required.
5. Keep your own version under review.

If an activity does not yet link to an example Risk Assessment, **do not run it until you have created and reviewed one**.

## Official Scouts risk assessment guidance (recommended reading)
Use these as the reference point for how risk assessments should be approached and reviewed:

- [Risk assessments (guidance)](https://www.scouts.org.uk/volunteers/staying-safe-and-safeguarding/risk-assessments/)
- [Example risk assessments](https://www.scouts.org.uk/volunteers/staying-safe-and-safeguarding/risk-assessments/example-risk-assessments/)
- [Planning and assessing risk](https://www.scouts.org.uk/volunteers/staying-safe-and-safeguarding/safety/planning-and-assessing-risk/)

## How editing works (for contributors)

This website is edited in the CMS and stored in GitHub.

### Key rule: Risk Assessments must be created first (recommended)
Activities can link to a Risk Assessment using a dropdown in the CMS.

- A Risk Assessment’s “ID” is the automatically generated **slug/filename** made from its Title.
  Example: a title “Soldering Basics” becomes `ra_soldering-basics`.
- **Do not rename** a Risk Assessment slug/filename after it has been used, because Activities may stop linking correctly.

### Recommended workflow
1. In the CMS, create the **Risk Assessment** first:
   - Fill in the hazards table and review date.
   - Save it.
2. Then create (or edit) the **Activity**:
   - Select the Risk Assessment from the **Risk Assessment dropdown**.
   - Save/publish the Activity.

### Drafts are allowed (not a blocker)
You *can* create an Activity without linking a Risk Assessment yet (for drafting).
However, leaders should **link an RA before using/publishing the activity**.
Activities with no linked RA will show “Not linked yet”.

## How to use this site
1. Pick an activity.
2. Check the **At a glance** box (time, difficulty, supervision).
3. Open the linked **Risk Assessment** and follow the controls.
4. Use the external tutorial links if needed.
5. Use badge links only as references (requirements change).

## Editorial / Quality notes
- Keep activities short and scannable.
- Avoid copying badge requirement text; link to official sources instead.
- Risk Assessments should be reviewed regularly (see review dates).
