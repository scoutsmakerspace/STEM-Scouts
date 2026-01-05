---
title: "Risk Assessment — LED Torch Build"
ra_id: led_torch
sections: [beavers, cubs]
location: indoors
supervision: medium
prepared_by: "Your Name"
created_date: 2026-01-05
review_date: 2026-07-05
version: "1.0"

hazards:
  - hazard: "Coin cell batteries"
    who: "Young people"
    risk_level: "Medium"
    controls: "No loose cells; leader holds spares; brief swallow risk; count batteries in/out; tape terminals when not in use; dispose safely."
    residual: "Low"

  - hazard: "Sharp tools (scissors)"
    who: "Young people"
    risk_level: "Low"
    controls: "Use safety scissors for Beavers; demonstrate safe carry; cut at tables only; leaders supervise."
    residual: "Low"

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
