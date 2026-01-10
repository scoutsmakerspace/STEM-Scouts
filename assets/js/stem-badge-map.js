(() => {
  const elSection = document.getElementById('stemSectionSelect');
  const elCategory = document.getElementById('stemCategorySelect');
  const elSearch = document.getElementById('stemSearchInput');
  const elBorderline = document.getElementById('stemIncludeBorderline');
  const elResults = document.getElementById('stemBadgeMapResults');

  if (!elSection || !elCategory || !elSearch || !elBorderline || !elResults) return;


  // ----------------------------
  // Activity links (badge -> activities) loaded from /assets/data/activities_index.json
  // Works on GitHub Pages project sites by deriving baseurl from this script's src.
  // ----------------------------
  let activitiesByBadge = {}; // { [badgeId]: [{title,url}, ...] }

  function getBaseUrl() {
    const script = document.currentScript || document.querySelector('script[src*="/assets/js/stem-badge-map.js"],script[src*="stem-badge-map.js"]');
    if (!script || !script.src) return '';
    try {
      const u = new URL(script.src, window.location.origin);
      const p = u.pathname;
      const marker = '/assets/js/stem-badge-map.js';
      const idx = p.indexOf(marker);
      if (idx >= 0) return p.slice(0, idx);
    } catch (e) {}
    return '';
  }

  async function loadActivitiesIndex() {
    const base = getBaseUrl();
    const url = `${base}/assets/data/activities_index.json`;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`activities_index.json fetch failed: ${r.status}`);
      const arr = await r.json();
      const by = {};
      (arr || []).forEach(a => {
        const badgeIds = Array.isArray(a.badge_ids) ? a.badge_ids : [];
        badgeIds.forEach(id => {
          const bid = String(id || '').trim();
          if (!bid) return;
          if (!by[bid]) by[bid] = [];
          by[bid].push({ title: a.title || bid, url: a.url || '#' });
        });
      });
      // De-dup + stable sort by title
      Object.keys(by).forEach(bid => {
        const seen = new Set();
        by[bid] = by[bid].filter(x => {
          const k = `${x.title}||${x.url}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).sort((a,b) => String(a.title).localeCompare(String(b.title)));
      });
      activitiesByBadge = by;
    } catch (e) {
      console.warn('[stem-badge-map] activity index not available:', e);
      activitiesByBadge = {};
    }
  }

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const norm = (s) => String(s || '').toLowerCase();

  const data = (window.STEM_BADGE_MAP_DATA && window.STEM_BADGE_MAP_DATA.badges)
    ? window.STEM_BADGE_MAP_DATA
    : { badges: [] };

  const badges = Array.isArray(data.badges) ? data.badges : [];

  function buildSections(items) {
    const set = new Set(items.map(b => b.section).filter(Boolean));
    const sections = Array.from(set).sort((a, b) => a.localeCompare(b));
    sections.sort((a, b) => (a === 'Staged' ? -1 : b === 'Staged' ? 1 : a.localeCompare(b)));
    return ['All', ...sections];
  }

  function buildCategories(items) {
    const set = new Set(items.map(b => b.category).filter(Boolean));
    const cats = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['All', ...cats];
  }

  function populateSelect(el, values) {
    el.innerHTML = '';
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    }
  }

  function requirementMatches(req, q) {
    if (!q) return true;
    return (
      norm(req.text).includes(q) ||
      norm(req.why_stem).includes(q) ||
      norm((req.areas || []).join(' ')).includes(q) ||
      norm(req.ref).includes(q)
    );
  }

  function badgeMatches(badge, q) {
    if (!q) return true;
    // Badge title/name must be searchable.
    if (norm(badge.title).includes(q)) return true;
    return (badge.stem_requirements || []).some(r => requirementMatches(r, q));
  }

  function renderBadges(items, q, section, category, includeBorderline) {
    const qn = norm(q).trim();
    const out = items
      .filter(b => (section === 'All' ? true : b.section === section))
      .filter(b => (category === 'All' ? true : b.category === category))
      .filter(b => badgeMatches(b, qn))
      .map(b => {
        const reqsAll = Array.isArray(b.stem_requirements) ? b.stem_requirements : [];
        const reqs = reqsAll
          .filter(r => includeBorderline ? true : r.strength !== 'borderline')
          .filter(r => requirementMatches(r, qn));

        if (reqs.length === 0) return null;

        const reqHtml = reqs.map(r => {
          const strengthTag = r.strength === 'borderline'
            ? '<span class="stem-tag stem-tag--borderline">Borderline</span>'
            : '<span class="stem-tag stem-tag--strong">Strong</span>';

          const areas = (r.areas || []).map(a => `<span class="stem-tag">${escapeHtml(a)}</span>`).join('');

          const prompts = Array.isArray(r.leader_prompts) ? r.leader_prompts : [];
          const promptHtml = prompts.length
            ? `<details><summary>Leader prompts</summary><div class="stem-prompts-lines">${prompts.map(p => `<div class="stem-prompt-line">${escapeHtml(p)}</div>`).join('')}</div></details>`
            ${actsHtml}
            : '';

          return `
            <div class="stem-req">
              <div class="stem-req__header">
                <span class="stem-req__ref">${escapeHtml(r.ref)}.</span>
                <span class="stem-req__text">${escapeHtml(r.text)}</span>
                ${strengthTag}
              </div>
              <div class="stem-req__areas">${areas}</div>
              <p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(r.why_stem || '').replace(/\n/g,'<br>')}</p>
              <div class="stem-req__prompt">${promptHtml}</div>
            </div>
          `;
        }).join('');

        const metaBits = [b.section, b.category].filter(Boolean).map(escapeHtml).join(' · ');
        const badgeId = String(b.badge_id || b.id || '').trim();
        const acts = badgeId && activitiesByBadge[badgeId] ? activitiesByBadge[badgeId] : [];
        const actsCount = acts.length;
        const actsPill = actsCount > 0
          ? `<span class="stem-badge-map__count stem-badge-map__count--acts">${actsCount} activit${actsCount === 1 ? 'y' : 'ies'}</span>`
          : '';
        const actsHtml = actsCount > 0
          ? `<div class="stem-badge-map__activities"><div class="stem-badge-map__activities-title">Used in activities</div><div class="stem-badge-map__activities-links">${acts.map(a => `<a class="stem-badge-map__activity-link" href="${escapeHtml(a.url)}">${escapeHtml(a.title)}</a>`).join('')}</div></div>`
          : '';
        return `
          <details>
            <summary>
              <span class="stem-badge-map__badge-title">${escapeHtml(b.title)}</span>
              <span class="stem-badge-map__badge-meta">${metaBits}</span>
              <span class="stem-badge-map__count">${reqs.length} requirement${reqs.length === 1 ? '' : 's'}</span>
              ${actsPill}
            </summary>
            ${reqHtml}
          </details>
        `;
      })
      .filter(Boolean);

    if (out.length === 0) {
      elResults.innerHTML = '<p><em>No matches.</em></p>';
      return;
    }

    elResults.innerHTML = out.join('');
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  // Populate filters
  populateSelect(elSection, buildSections(badges));
  populateSelect(elCategory, buildCategories(badges));

  const rerender = () => renderBadges(
    badges,
    elSearch.value,
    elSection.value,
    elCategory.value,
    !!elBorderline.checked
  );

  const rerenderDebounced = debounce(rerender, 120);
  elSearch.addEventListener('input', rerenderDebounced);
  elSection.addEventListener('change', rerender);
  elCategory.addEventListener('change', rerender);
  elBorderline.addEventListener('change', rerender);

  rerender();
  loadActivitiesIndex().finally(() => rerender());
})();
