---
title: "LED Torch Build"
sections: [beavers, cubs]
difficulty: 2
time_minutes: 45
type: electronics
location: indoors
kit: ["LEDs", "coin cell", "tape", "card", "scissors"]
supervision: medium
summary: "Build a simple LED torch and learn polarity + circuits."

risk_id: led_torch

external_docs:
  - title: "LED polarity guide"
    url: "https://example.com/led-polarity"

badges:
  - section: "Cubs"
    badge: "Scientist"
    requirement_note: "Badge requirements reference link"
    url: "https://example.com/cubs-scientist"
---

## At a glance
- **Time:** {{ page.time_minutes }} min  
- **Difficulty:** {{ page.difficulty }}/5  
- **Sections:** {{ page.sections | join: ", " }}  
- **Supervision:** {{ page.supervision }}

## Risk assessment
{% assign ra = site.risk_assessments | where: "ra_id", page.risk_id | first %}
{% if ra %}
- **Risk Assessment:** [{{ ra.title }}]({{ ra.url }})
{% else %}
- **Risk Assessment:** Not linked yet
{% endif %}

## You will need
{% for k in page.kit %}
- {{ k }}
{% endfor %}

## Steps
1. Make the torch body from card.
2. Tape the LED to the battery (show polarity).
3. Test and troubleshoot (flip LED, check contact points).
4. Extension: add a simple switch using a paper flap.

## Adaptations by section
### Beavers
- Pre-cut some card.
- Focus on “LED has a + and - leg”.

### Cubs
- Add a proper switch.
- Encourage debugging and explaining what changed.

## External tutorials
{% for d in page.external_docs %}
- [{{ d.title }}]({{ d.url }})
{% endfor %}

## Badge links
{% for b in page.badges %}
- **{{ b.section }} – {{ b.badge }}:** {{ b.requirement_note }} ([Link]({{ b.url }}))
{% endfor %}
