---
layout: risk_assessment
title: "LED Torch Build"
activity_name_location: "LED Torch Build (Scout hut)"
date_of_ra: 2026-01-07
next_review: 2026-07-07
assessor: "Bogdan Alecsa"
sections: ["Cubs", "Scouts"]

hazards:
  - hazard: "Sharp wire ends"
    risk: "Cuts / punctures"
    who: "Young people, leaders"
    controls: "- Demonstrate safe wire stripping\n- Provide side cutters\n- Keep offcuts in a tub\n- First aid kit available"
    review: "If younger group, pre-strip wires"
  - hazard: "Coin cell battery"
    risk: "Swallowing hazard"
    who: "Young people"
    controls: "- Count batteries in/out\n- No loose batteries left on tables\n- Adults handle spares\n- Clear briefing at start"
    review: "For Beavers, use sealed battery holders only"
---


emergency:
  first_aid: "Leader first aid kit accessible; treat minor cuts immediately; record incidents as required."
  fire: "Follow venue fire procedure; isolate batteries if overheating; stop activity if any battery damage is suspected."
---

## Summary (Scout-style)
**Activity:** LED Torch Build  
**Where:** Indoors  
**Supervision:** Medium  
**Applies to:** Beavers, Cubs  

## Hazard & Control Table

| Hazard | Who might be harmed | Initial risk | Control measures (standardised) | Residual risk |
|---|---|---|---|---|
{% for h in page.hazards %}
| {'{'} h.hazard {'}'} | {'{'} h.who {'}'} | {'{'} h.risk_level {'}'} | {'{'} h.controls {'}'} | {'{'} h.residual {'}'} |
{% endfor %}

## Emergency / Incident
- **First aid:** {'{'} page.emergency.first_aid {'}'}
- **Fire:** {'{'} page.emergency.fire {'}'}
