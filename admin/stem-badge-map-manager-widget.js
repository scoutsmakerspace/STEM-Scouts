(function () {
  // Decap CMS custom widget: stem_badge_map_manager
  // Purpose: manage the entire STEM badge mapping from one place, reliably.
  //
  // Stored value shape (YAML/JSON object):
  // {
  //   badges: {
  //     "<badge_id>": {
  //       badge_title: "Section — Badge name",
  //       req: {
  //         "1": { include: true, text: "...", strength: "strong", areas: [...], why_stem: "...", leader_prompts: [...] },
  //         "2": { include: false, ... },
  //       }
  //     }
  //   }
  // }

  function ready() {
    return !!(window.CMS && window.createClass && window.h);
  }

  let _badges = null;
  let _loading = null;

  function normalizeBadgesPayload(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.badges)) return json.badges;
    return [];
  }

  async function loadBadges() {
    if (_badges) return _badges;
    if (_loading) return _loading;

    _loading = fetch('./badges_master.json', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('badges_master.json fetch failed: ' + r.status);
        return r.json();
      })
      .then((json) => {
        const arr = normalizeBadgesPayload(json);
        _badges = (arr || [])
          .map((b) => {
            const title = (b.badge_name || b.title || b.badge || '').toString().trim();
            const section = (b.section_label || b.section || '').toString().trim();
            const display = [section, title].filter(Boolean).join(' — ');

            const reqs = Array.isArray(b.requirements) ? b.requirements : [];
            const requirements = reqs
              .filter((r) => r && (r.id != null || r.no != null || r.ref != null) && (r.text || r.requirement))
              .map((r) => {
                const ref = String(r.ref ?? r.id ?? r.no).trim();
                const text = String(r.text ?? r.requirement).trim();
                const kind = (r.kind || 'req').toString();
                return { ref, text, kind };
              })
              // keep only actual numbered requirements (ignore headings/notes)
              .filter((r) => r.kind === 'req' || r.kind === 'requirement' || r.kind === undefined);

            return {
              id: String(b.id || '').trim(),
              title,
              section,
              display,
              requirements,
            };
          })
          .filter((b) => b.id && b.display);

        _badges.sort((a, b) => a.display.localeCompare(b.display));
        console.log('[stem_badge_map_manager] loaded badges:', _badges.length);
        return _badges;
      })
      .catch((e) => {
        console.error('[stem_badge_map_manager] load failed:', e);
        _badges = [];
        return _badges;
      });

    return _loading;
  }

  function toPlain(v) {
    if (v && typeof v.get === 'function') {
      try {
        return v.toJS();
      } catch (e) {
        return {};
      }
    }
    return v && typeof v === 'object' ? v : {};
  }

  const AREA_OPTIONS = [
    'Computing & programming',
    'Digital systems',
    'Electronics & circuits',
    'Science & investigation',
    'Engineering & design',
    'Maths & data',
    'Radio & space',
    'Materials & making',
    'STEM careers & workplaces',
  ];

  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return {
          loading: true,
          badges: [],
          query: '',
          expanded: {}, // badge_id -> bool
          map: { badges: {} },
        };
      },

      async componentDidMount() {
        const badges = await loadBadges();
        this.setState({ badges, loading: false });
        this.hydrate(this.props.value);
      },

      componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value) {
          this.hydrate(this.props.value);
        }
      },

      hydrate(value) {
        const v = toPlain(value);
        const map = v && typeof v === 'object' ? v : {};
        const safe = {
          badges: map.badges && typeof map.badges === 'object' ? map.badges : {},
        };

        // Avoid clobbering mid-edit
        if (JSON.stringify(safe) === JSON.stringify(this.state.map)) return;
        this.setState({ map: safe });
      },

      emit(nextMap) {
        this.props.onChange(nextMap);
      },

      // Ensure badge container exists in map
      ensureBadge(badge) {
        const cur = { ...this.state.map.badges };
        if (!cur[badge.id]) {
          cur[badge.id] = {
            badge_title: badge.display,
            req: {},
          };
        } else {
          // keep badge_title fresh (handles title updates in master)
          cur[badge.id] = {
            ...cur[badge.id],
            badge_title: cur[badge.id].badge_title || badge.display,
            req: cur[badge.id].req && typeof cur[badge.id].req === 'object' ? cur[badge.id].req : {},
          };
        }
        const next = { badges: cur };
        this.setState({ map: next });
        return next;
      },

      toggleExpanded(badge_id) {
        const expanded = { ...this.state.expanded, [badge_id]: !this.state.expanded[badge_id] };
        this.setState({ expanded });
      },

      // Add (publish) requirement mapping
      publishReq(badge, req) {
        const baseMap = this.ensureBadge(badge);
        const curBadges = { ...baseMap.badges };
        const b = curBadges[badge.id];

        const reqMap = { ...(b.req || {}) };
        reqMap[req.ref] = {
          include: true,
          text: req.text,
          strength: (reqMap[req.ref] && reqMap[req.ref].strength) ? reqMap[req.ref].strength : 'strong',
          areas: (reqMap[req.ref] && Array.isArray(reqMap[req.ref].areas)) ? reqMap[req.ref].areas : [],
          why_stem: (reqMap[req.ref] && reqMap[req.ref].why_stem) ? reqMap[req.ref].why_stem : '',
          leader_prompts: (reqMap[req.ref] && Array.isArray(reqMap[req.ref].leader_prompts)) ? reqMap[req.ref].leader_prompts : [],
        };

        curBadges[badge.id] = { ...b, req: reqMap, badge_title: badge.display };
        const next = { badges: curBadges };
        this.setState({ map: next });
        this.emit(next);
      },

      // Remove (unpublish) requirement mapping entirely
      unpublishReq(badge, reqRef) {
        const curBadges = { ...(this.state.map.badges || {}) };
        const b = curBadges[badge.id];
        if (!b || !b.req) return;
        const reqMap = { ...b.req };
        delete reqMap[reqRef];

        // If a badge ends up with no mapped reqs, keep the badge container
        // (so the editor still shows it as “touched”), but it won’t render on the site.
        curBadges[badge.id] = { ...b, req: reqMap, badge_title: b.badge_title || badge.display };
        const next = { badges: curBadges };
        this.setState({ map: next });
        this.emit(next);
      },

      setReqField(badge, ref, patch) {
        const curBadges = { ...(this.state.map.badges || {}) };
        const b = curBadges[badge.id] || { badge_title: badge.display, req: {} };
        const reqMap = { ...(b.req || {}) };
        const base = Object.assign(
          { include: true, text: '', strength: 'strong', areas: [], why_stem: '', leader_prompts: [] },
          reqMap[ref] || {}
        );
        reqMap[ref] = Object.assign(base, patch);
        curBadges[badge.id] = { ...b, badge_title: b.badge_title || badge.display, req: reqMap };
        const next = { badges: curBadges };
        this.setState({ map: next });
        this.emit(next);
      },

      render() {
        if (this.state.loading) return h('div', null, 'Loading badge data…');

        const q = (this.state.query || '').trim().toLowerCase();
        const badges = q
          ? this.state.badges.filter((b) => b.display.toLowerCase().includes(q))
          : this.state.badges;

        const mapBadges = this.state.map.badges || {};

        return h(
          'div',
          { style: { border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: 12 } },

          h('div', { style: { fontWeight: 800, marginBottom: 6 } }, 'STEM Badge Map Manager'),
          h(
            'div',
            { style: { opacity: 0.85, fontSize: 13, marginBottom: 12 } },
            'Search a badge, expand it, then publish/unpublish individual requirements. This avoids “sometimes it saves, sometimes it doesn’t” problems caused by creating/deleting lots of separate files.'
          ),

          h('input', {
            type: 'text',
            placeholder: 'Search badge…',
            value: this.state.query,
            onChange: (e) => this.setState({ query: e.target.value }),
            style: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', marginBottom: 12 },
          }),

          badges.map((badge) => {
            const bState = mapBadges[badge.id] || null;
            const reqMap = (bState && bState.req && typeof bState.req === 'object') ? bState.req : {};
            const mappedCount = Object.keys(reqMap).length;
            const expanded = !!this.state.expanded[badge.id];

            const headerBg = mappedCount > 0 ? 'rgba(76, 175, 80, 0.12)' : 'rgba(0,0,0,0.03)';
            const headerBorder = mappedCount > 0 ? 'rgba(76, 175, 80, 0.35)' : 'rgba(0,0,0,0.10)';

            return h(
              'div',
              { key: badge.id, style: { border: '1px solid ' + headerBorder, borderRadius: 8, marginBottom: 10, overflow: 'hidden' } },
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => this.toggleExpanded(badge.id),
                  style: {
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: headerBg,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  },
                },
                h('span', { style: { fontWeight: 700 } }, badge.display),
                h(
                  'span',
                  { style: { fontSize: 12, opacity: 0.85 } },
                  mappedCount > 0 ? `✅ ${mappedCount} mapped` : '—'
                )
              ),

              expanded
                ? h(
                    'div',
                    { style: { padding: 12 } },
                    badge.requirements.map((r) => {
                      const row = reqMap[r.ref];
                      const isOn = !!row;
                      const strength = row && row.strength ? row.strength : 'strong';

                      return h(
                        'div',
                        { key: r.ref, style: { borderTop: '1px solid rgba(0,0,0,0.08)', padding: '10px 0' } },
                        h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
                          h('div', { style: { minWidth: 30, fontWeight: 800 } }, r.ref),
                          h('div', { style: { flex: 1 } },
                            h('div', { style: { fontWeight: 600 } }, r.text),
                            isOn
                              ? h('div', { style: { marginTop: 8, marginLeft: 0 } },
                                  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                                    h('span', { style: { fontSize: 12, opacity: 0.8 } }, 'Strength:'),
                                    h(
                                      'select',
                                      {
                                        value: strength,
                                        onChange: (e) => this.setReqField(badge, r.ref, { strength: e.target.value }),
                                        style: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' },
                                      },
                                      h('option', { value: 'strong' }, 'Strong'),
                                      h('option', { value: 'borderline' }, 'Borderline')
                                    )
                                  ),

                                  h('div', { style: { fontWeight: 600, marginTop: 10, marginBottom: 4 } }, 'STEM areas'),
                                  h(
                                    'div',
                                    { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                                    AREA_OPTIONS.map((a) => {
                                      const cur = row && Array.isArray(row.areas) ? row.areas : [];
                                      const checked = cur.includes(a);
                                      return h(
                                        'label',
                                        { key: a, style: { display: 'flex', gap: 6, alignItems: 'center' } },
                                        h('input', {
                                          type: 'checkbox',
                                          checked,
                                          onChange: () => {
                                            const next = checked ? cur.filter((x) => x !== a) : cur.concat([a]);
                                            this.setReqField(badge, r.ref, { areas: next });
                                          },
                                        }),
                                        h('span', null, a)
                                      );
                                    })
                                  ),

                                  h('div', { style: { fontWeight: 600, marginTop: 10, marginBottom: 4 } }, 'Why is it STEM?'),
                                  h('textarea', {
                                    value: row && row.why_stem ? row.why_stem : '',
                                    onChange: (e) => this.setReqField(badge, r.ref, { why_stem: e.target.value }),
                                    rows: 3,
                                    style: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' },
                                  }),

                                  h('div', { style: { fontWeight: 600, marginTop: 10, marginBottom: 4 } }, 'Leader prompts (one per line)'),
                                  h('textarea', {
                                    value: (row && Array.isArray(row.leader_prompts) ? row.leader_prompts : []).join('\n'),
                                    onChange: (e) => {
                                      const lines = String(e.target.value || '')
                                        .split(/\r?\n/)
                                        .map((x) => x.trim())
                                        .filter(Boolean);
                                      this.setReqField(badge, r.ref, { leader_prompts: lines });
                                    },
                                    rows: 3,
                                    style: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' },
                                  })
                                )
                              : null
                          ),
                          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                            !isOn
                              ? h(
                                  'button',
                                  {
                                    type: 'button',
                                    onClick: () => this.publishReq(badge, r),
                                    style: { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' },
                                  },
                                  'Add'
                                )
                              : h(
                                  'button',
                                  {
                                    type: 'button',
                                    onClick: () => this.unpublishReq(badge, r.ref),
                                    style: { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' },
                                  },
                                  'Remove'
                                )
                          )
                        )
                      );
                    })
                  )
                : null
            );
          })
        );
      },
    });

    const Preview = createClass({
      render() {
        const v = toPlain(this.props.value);
        const count = v && v.badges ? Object.keys(v.badges).length : 0;
        return h('div', null, `STEM Badge Map (${count} badge entries)`);
      },
    });

    CMS.registerWidget('stem_badge_map_manager', Control, Preview);
    console.log('[stem_badge_map_manager] widget registered');
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (register() || tries > 200) clearInterval(timer);
  }, 100);
})();
