(() => {
  const DATA_URL = (window.siteBaseUrl || '') + '/assets/data/stem_badge_map.json';

  const elSection = document.getElementById('stemSectionSelect');
  const elSearch = document.getElementById('stemSearchInput');
  const elBorderline = document.getElementById('stemIncludeBorderline');
  const elResults = document.getElementById('stemBadgeMapResults');

  if (!elSection || !elSearch || !elBorderline || !elResults) return;

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const norm = (s) => String(s || '').toLowerCase();

  function applyOverrides(badges, overrides) {
    if (!Array.isArray(overrides) || overrides.length === 0) return badges;

    const byId = new Map(badges.map(b => [b.badge_id, b]));

    for (const ov of overrides) {
      if (!ov || !ov.badge_id || !ov.requirement_ref) continue;
      const action = (ov.action || 'include');

      let badge = byId.get(ov.badge_id);

      if (!badge) {
        // Create badge container only if we are including something
        if (action !== 'include') continue;
        badge = {
          badge_id: ov.badge_id,
          title: ov.badge_title || ov.badge_id,
          section: ov.section || '',
          section_slug: ov.section_slug || '',
          category: ov.category || '',
          badge_type: ov.badge_type || '',
          stem_requirements: []
        };
        byId.set(ov.badge_id, badge);
      }

      const reqs = Array.isArray(badge.stem_requirements) ? badge.stem_requirements : (badge.stem_requirements = []);
      const idx = reqs.findIndex(r => r && r.ref === ov.requirement_ref);

      if (action === 'exclude') {
        if (idx >= 0) reqs.splice(idx, 1);
        if (reqs.length === 0) {
          byId.delete(ov.badge_id);
        }
        continue;
      }

      // include (add or update)
      const next = {
        rid: ov.rid || (ov.badge_id + '::' + ov.requirement_ref),
        ref: ov.requirement_ref,
        text: ov.requirement_text || '',
        strength: ov.strength || 'borderline',
        areas: Array.isArray(ov.areas) ? ov.areas : [],
        why_stem: ov.why_stem || '',
        leader_prompts: Array.isArray(ov.leader_prompts) ? ov.leader_prompts : []
      };

      if (idx >= 0) reqs[idx] = next;
      else reqs.push(next);
    }

    const out = Array.from(byId.values());
    // stable sort by section then title
    out.sort((a, b) => {
      const sa = (a.section || '').localeCompare(b.section || '');
      if (sa !== 0) return sa;
      return (a.title || '').localeCompare(b.title || '');
    });
    return out;
  }

  function buildSections(badges) {
    const set = new Set(badges.map(b => b.section));
    const sections = Array.from(set).sort((a,b) => a.localeCompare(b));
    // Put Staged first
    sections.sort((a,b) => (a === 'Staged' ? -1 : b === 'Staged' ? 1 : a.localeCompare(b)));
    return ['All', ...sections];
  }

  function populateSectionSelect(sections) {
    elSection.innerHTML = '';
    for (const s of sections) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      elSection.appendChild(opt);
    }
  }

  function requirementMatches(req, q) {
    if (!q) return true;
    return norm(req.text).includes(q) || norm(req.why_stem).includes(q) || norm((req.areas || []).join(' ')).includes(q) || norm(req.ref).includes(q);
  }

  function badgeMatches(badge, q) {
    if (!q) return true;
    if (norm(badge.title).includes(q)) return true;
    return badge.stem_requirements.some(r => requirementMatches(r, q));
  }

  function renderBadges(badges, q, section, includeBorderline) {
    const items = badges
      .filter(b => section === 'All' ? true : b.section === section)
      .filter(b => badgeMatches(b, q))
      .map(b => {
        const reqs = b.stem_requirements
          .filter(r => includeBorderline ? true : r.strength !== 'borderline')
          .filter(r => requirementMatches(r, q));

        if (reqs.length === 0) return null;

        const reqHtml = reqs.map(r => {
          const strengthTag = r.strength === 'borderline'
            ? '<span class="stem-tag stem-tag--borderline">Borderline</span>'
            : '<span class="stem-tag stem-tag--strong">Strong</span>';

          const areas = (r.areas || []).map(a => `<span class="stem-tag">${escapeHtml(a)}</span>`).join('');

          const prompts = Array.isArray(r.leader_prompts) ? r.leader_prompts : [];
          const promptHtml = prompts.length
            ? `<details><summary>Leader prompts</summary><ul>${prompts.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul></details>`
            : '';

          return `
            <div class="stem-req">
              <div class="stem-req__header">
                <span class="stem-req__ref">${escapeHtml(r.ref)}.</span>
                <span class="stem-req__text">${escapeHtml(r.text)}</span>
                ${strengthTag}
              </div>
              <div class="stem-req__areas">${areas}</div>
              <p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(r.why_stem)}</p>
              <div class="stem-req__prompt">${promptHtml}</div>
            </div>
          `;
        }).join('');

        const metaBits = [b.section, b.category].filter(Boolean).map(escapeHtml).join(' · ');
        return `
          <details>
            <summary>
              <span class="stem-badge-map__badge-title">${escapeHtml(b.title)}</span>
              <span class="stem-badge-map__badge-meta">${metaBits}</span>
              <span class="stem-badge-map__count">${reqs.length} requirement${reqs.length === 1 ? '' : 's'}</span>
            </summary>
            ${reqHtml}
          </details>
        `;
      })
      .filter(Boolean);

    if (items.length === 0) {
      elResults.innerHTML = '<p><em>No matches.</em></p>';
      return;
    }

    elResults.innerHTML = items.join('');
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  fetch(DATA_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('Failed to load STEM badge map');
      return r.json();
    })
    .then(data => {
      const baseBadges = (data && data.badges) ? data.badges : [];
      const badges = applyOverrides(baseBadges, window.STEM_MAP_OVERRIDES || []);
      const sections = buildSections(badges);
      populateSectionSelect(sections);

      const rerender = () => renderBadges(
        badges,
        norm(elSearch.value).trim(),
        elSection.value,
        !!elBorderline.checked
      );

      const rerenderDebounced = debounce(rerender, 120);

      elSearch.addEventListener('input', rerenderDebounced);
      elSection.addEventListener('change', rerender);
      elBorderline.addEventListener('change', rerender);

      rerender();
    })
    .catch(err => {
      console.error(err);
      elResults.innerHTML = '<p><em>Could not load the STEM badge map.</em></p>';
    });
})();
