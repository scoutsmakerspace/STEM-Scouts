(function(){
  const el = (id) => document.getElementById(id);
  const root = el('stemBadgeMap');
  if (!root) return;

  const tabsEl = el('sbmTabs');
  const includeUniversalEl = el('sbmIncludeUniversal');
  const searchEl = el('sbmSearch');
  const areaEl = el('sbmArea');
  const sortEl = el('sbmSort');
  const metaEl = el('sbmMeta');
  const resultsEl = el('sbmResults');

  const jsonUrl = (root.getAttribute('data-json') || (window.__SBM_JSON_URL)) || (window.location.origin + (window.location.pathname.includes('STEM-Scouts') ? '/STEM-Scouts' : '') + '/assets/data/stem_badge_map.json');

  let data = null;
  let activeSection = 'beavers';

  function relUrl(p){
    // Jekyll baseurl-safe: if site uses /STEM-Scouts base, keep it
    const base = document.querySelector('meta[name="baseurl"]')?.content || '';
    if (p.startsWith('http')) return p;
    return (base || '') + p;
  }

  function uniq(arr){
    const s = new Set();
    const out = [];
    for (const x of arr){
      if (!s.has(x)) { s.add(x); out.push(x); }
    }
    return out;
  }

  function buildTabs(){
    const sectionKeys = Object.keys(data.sections);
    // prefer this order
    const order = ['squirrels','beavers','cubs','scouts','explorers'];
    const keys = order.filter(k => sectionKeys.includes(k)).concat(sectionKeys.filter(k => !order.includes(k)));

    tabsEl.innerHTML = '';
    keys.forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sbm-tab';
      b.textContent = data.sections[k].label || k;
      b.setAttribute('aria-selected', k === activeSection ? 'true' : 'false');
      b.addEventListener('click', () => {
        activeSection = k;
        for (const btn of tabsEl.querySelectorAll('.sbm-tab')) btn.setAttribute('aria-selected','false');
        b.setAttribute('aria-selected','true');
        render();
      });
      tabsEl.appendChild(b);
    });
  }

  function buildAreaSelect(){
    const opts = ['All STEM areas'].concat(data.areas || []);
    areaEl.innerHTML = '';
    opts.forEach((t, i) => {
      const o = document.createElement('option');
      o.value = i === 0 ? '' : t;
      o.textContent = t;
      areaEl.appendChild(o);
    });
  }

  function getBadgesForCurrent(){
    const sec = data.sections[activeSection];
    const secBadges = sec ? (sec.badges || []) : [];
    const uBadges = includeUniversalEl.checked ? (data.universal?.badges || []) : [];

    // mark universal ones so we can label them
    const uIds = new Set(uBadges.map(b => b.id));

    const merged = secBadges.concat(uBadges).map(b => ({...b, _isUniversal: uIds.has(b.id)}));
    // de-dup by id (in case a badge appears twice)
    const seen = new Set();
    const out = [];
    for (const b of merged){
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      out.push(b);
    }
    return out;
  }

  function matches(badge, q, area){
    const hay = (
      badge.title + ' ' + badge.category + ' ' + badge.primary_area + ' ' + (badge.areas || []).join(' ') + ' ' +
      (badge.requirements || []).map(r => `${r.id} ${r.text} ${r.primary_area} ${r.reason}`).join(' ')
    ).toLowerCase();

    if (q && !hay.includes(q)) return false;
    if (area){
      const hasArea = (badge.primary_area === area) || (badge.areas || []).includes(area) || (badge.requirements || []).some(r => r.primary_area === area || (r.areas||[]).includes(area));
      if (!hasArea) return false;
    }
    return true;
  }

  function sortBadges(list){
    const mode = sortEl.value;
    const arr = list.slice();
    if (mode === 'stemcount'){
      arr.sort((a,b) => (b.requirements_stem_count||0) - (a.requirements_stem_count||0) || a.title.localeCompare(b.title));
    } else {
      arr.sort((a,b) => a.title.localeCompare(b.title));
    }
    return arr;
  }

  function render(){
    const q = (searchEl.value || '').trim().toLowerCase();
    const area = areaEl.value || '';

    let list = getBadgesForCurrent().filter(b => matches(b, q, area));
    list = sortBadges(list);

    metaEl.textContent = `${list.length} badge${list.length===1?'':'s'} shown` + (includeUniversalEl.checked ? ' (including staged/universal)' : '');

    resultsEl.innerHTML = '';

    list.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'sbm-card';

      const head = document.createElement('div');
      head.className = 'sbm-card-head';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'sbm-badge-title';
      title.textContent = b.title;
      left.appendChild(title);

      const sub = document.createElement('div');
      sub.className = 'sbm-badge-sub';
      const parts = [];
      if (b._isUniversal) parts.push('Staged / Universal');
      if (b.category) parts.push(b.category);
      if (b.primary_area) parts.push(b.primary_area);
      if (b.requirements_stem_count != null && b.requirements_total != null) parts.push(`${b.requirements_stem_count}/${b.requirements_total} reqs flagged as STEM`);
      sub.textContent = parts.join(' • ');
      left.appendChild(sub);

      // pills
      const pills = document.createElement('div');
      (b.areas || []).slice(0, 4).forEach((t) => {
        const p = document.createElement('span');
        p.className = 'sbm-pill';
        p.textContent = t;
        pills.appendChild(p);
      });
      left.appendChild(pills);

      const right = document.createElement('div');
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sbm-tab';
      toggle.textContent = 'Show requirements';
      toggle.setAttribute('aria-expanded', 'false');
      right.appendChild(toggle);

      head.appendChild(left);
      head.appendChild(right);
      card.appendChild(head);

      const reqWrap = document.createElement('div');
      reqWrap.className = 'sbm-reqs';
      reqWrap.style.display = 'none';

      (b.requirements || []).forEach((r) => {
        const row = document.createElement('div');
        row.className = 'sbm-req';

        const line1 = document.createElement('div');
        line1.innerHTML = `<span class="sbm-req-id">${escapeHtml(r.id)}.</span> ${escapeHtml(r.text)}`;

        const line2 = document.createElement('div');
        line2.className = 'sbm-req-reason';
        line2.textContent = `${r.primary_area} — ${r.reason}`;

        row.appendChild(line1);
        row.appendChild(line2);
        reqWrap.appendChild(row);
      });

      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        toggle.textContent = expanded ? 'Show requirements' : 'Hide requirements';
        reqWrap.style.display = expanded ? 'none' : 'block';
      });

      card.appendChild(reqWrap);
      resultsEl.appendChild(card);
    });
  }

  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[c]));
  }

  async function init(){
    try{
      const r = await fetch(relUrl('/assets/data/stem_badge_map.json'), { cache: 'no-store' });
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      data = await r.json();
    }catch(e){
      console.error('[stem_badge_map] load failed', e);
      metaEl.textContent = 'Could not load badge mapping data.';
      return;
    }

    // default section: beavers if available
    const keys = Object.keys(data.sections || {});
    activeSection = keys.includes('beavers') ? 'beavers' : (keys[0] || 'beavers');

    buildTabs();
    buildAreaSelect();

    includeUniversalEl.addEventListener('change', render);
    searchEl.addEventListener('input', render);
    areaEl.addEventListener('change', render);
    sortEl.addEventListener('change', render);

    render();
  }

  init();
})();
