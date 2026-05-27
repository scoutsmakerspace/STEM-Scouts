# STEM Badge Map V2.1

This is a curated first-pass map for spotting honest STEM opportunities inside Scout badge requirements.

It deliberately separates:

- **Direct STEM** — the requirement is already STEM by nature.
- **STEM through framing** — the requirement can support STEM when the leader adds evidence, measurement, testing, comparison, design constraints, modelling, debugging, or explanation.

The map is generated from `_data/badges_master.json` by `tools/build_stem_badge_map_v2.py`. It does **not** remove or edit the main badge database. It only rebuilds `_data/stem_badge_map.yml`, which is the public planning layer used by `/badges/`.

This is still a review baseline, not final gospel. The intended workflow is:

1. Generate the first pass.
2. Review weak or surprising links on the public page.
3. Tune the rules or edit selected entries in the CMS.
4. Keep only links that can be explained honestly to a leader.

Rule of thumb:

> A link belongs in the map only when a leader can realistically ask young people to observe, measure, compare, classify, predict, test, record, calculate, design, build, debug, improve, model, control, communicate or evaluate something.

Do not count a requirement as STEM just because it involves making, talking, drawing, cooking or being outdoors. The STEM part has to come from the thinking and evidence added to the activity.
