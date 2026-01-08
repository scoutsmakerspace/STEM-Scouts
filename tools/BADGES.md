# Badges (canonical + generated)

- **Canonical source of truth:** `_data/badges_master.json`
- **Generated Decap collection:** `_badges/*.md`

Why both:
- The website can read one JSON file.
- Decap CMS relation widgets need a collection of entries to power dropdown/search.

To regenerate `_badges/` after updating the master JSON:

```bash
python tools/generate_badges.py
```
