(function () {
  // Decap CMS custom widget: stem_override
  // One file per badge under _data/stem_overrides/*.yml
  // Value shape:
  //   { badge_id: "...", req: { "3": {include:true, strength:"strong", areas:[...], why_stem:"...", leader_prompts:[...] }, ... } }

  function ready() {
    return !!(window.CMS && window.createClass && window.h);
  }

  let _badges = null;
  let _loading = null;

  function normalizeBadgesPayload(json) {
    // Accept either: {badges:[...]} or [...]
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
        _badges = (arr || []).map((b) => {
          const title = (b.badge_name || b.title || b.badge || '').toString().trim();
          const section = (b.section || '').toString().trim();
          const category = (b.category || '').toString().trim();
          const display = [section, title].filter(Boolean).join(' — ');

          const reqs = Array.isArray(b.requirements) ? b.requirements : [];
          const requirements = reqs
            .filter((r) => r && (r.id != null || r.no != null || r.ref != null) && (r.text || r.requirement))
            .map((r) => {
              const ref = String(r.ref ?? r.id ?? r.no).trim();
              const text = String(r.text ?? r.requirement).trim();
              const rid = String(r.rid ?? (b.id + '::' + ref));
              return { ref, rid, text };
            });

          return {
            id: String(b.id || '').trim(),
            title,
            section,
            category,
            display,
            requirements,
          };
        }).filter(b => b.id && b.display);

        _badges.sort((a, b) => a.display.localeCompare(b.display));
        console.log('[stem_override] loaded badges:', _badges.length);
        return _badges;
      })
      .catch((e) => {
        console.error('[stem_override] load failed:', e);
        _badges = [];
        return _badges;
      });

    return _loading;
  }

  function toPlain(v) {
    if (v && typeof v.get === 'function') {
      try { return v.toJS(); } catch (e) { return {}; }
    }
    return (v && typeof v === 'object') ? v : {};
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
          badge_id: '',
          req: {},
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
        const badge_id = (v.badge_id || '').toString();
        const req = (v.req && typeof v.req === 'object') ? v.req : {};

        // Avoid clobbering mid-edit
        if (badge_id === this.state.badge_id && JSON.stringify(req) === JSON.stringify(this.state.req)) return;
        this.setState({ badge_id, req });
      },

      emit(next) {
        this.props.onChange({
          badge_id: next.badge_id || '',
          req: next.req || {},
        });
      },

      setBadge(badge_id) {
        // When changing badge, reset mapping to avoid accidental carry-over
        this.setState({ badge_id, req: {} });
        this.emit({ badge_id, req: {} });
      },

      setReqField(ref, patch) {
        const cur = Object.assign({}, this.state.req);
        const base = Object.assign(
          { include: false, strength: 'strong', areas: [], why_stem: '', leader_prompts: [] },
          cur[ref] || {}
        );
        cur[ref] = Object.assign(base, patch);
        this.setState({ req: cur });
        this.emit({ badge_id: this.state.badge_id, req: cur });
      },

      toggleInclude(ref) {
        const cur = this.state.req[ref] || {};
        this.setReqField(ref, { include: !cur.include });
      },

      addPrompt(ref) {
        const row = this.state.req[ref] || {};
        const arr = Array.isArray(row.leader_prompts) ? row.leader_prompts.slice() : [];
        arr.push('');
        this.setReqField(ref, { leader_prompts: arr });
      },

      setPrompt(ref, idx, text) {
        const row = this.state.req[ref] || {};
        const arr = Array.isArray(row.leader_prompts) ? row.leader_prompts.slice() : [];
        arr[idx] = text;
        this.setReqField(ref, { leader_prompts: arr });
      },

      removePrompt(ref, idx) {
        const row = this.state.req[ref] || {};
        const arr = Array.isArray(row.leader_prompts) ? row.leader_prompts.slice() : [];
        arr.splice(idx, 1);
        this.setReqField(ref, { leader_prompts: arr });
      },

      render() {
        if (this.state.loading) return h('div', null, 'Loading badges…');

        const q = (this.state.query || '').trim().toLowerCase();
        const badges = q
          ? this.state.badges.filter((b) => b.display.toLowerCase().includes(q))
          : this.state.badges;

        const selected = this.state.badge_id
          ? this.state.badges.find((b) => b.id === this.state.badge_id)
          : null;

        return h(
          'div',
          { style: { border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: 12 } },

          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('input', {
              type: 'text',
              placeholder: 'Search badge…',
              value: this.state.query,
              onChange: (e) => this.setState({ query: e.target.value }),
              style: { flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' },
            })
          ),

          h(
            'select',
            {
              value: this.state.badge_id || '',
              onChange: (e) => this.setBadge(e.target.value),
              style: {
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.2)',
                marginBottom: 12,
              },
            },
            h('option', { value: '' }, 'Select a badge…'),
            badges.map((b) => h('option', { key: b.id, value: b.id }, b.display))
          ),

          selected
            ? h(
                'div',
                null,
                h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Requirements'),
                selected.requirements.map((r) => {
                  const ref = r.ref;
                  const row = this.state.req[ref] || {};
                  const include = !!row.include;

                  return h(
                    'div',
                    { key: ref, style: { borderTop: '1px solid rgba(0,0,0,0.08)', padding: '10px 0' } },

                    h(
                      'label',
                      { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
                      h('input', {
                        type: 'checkbox',
                        checked: include,
                        onChange: () => this.toggleInclude(ref),
                        style: { marginTop: 3 },
                      }),
                      h('div', null, h('div', { style: { fontWeight: 700 } }, `${ref}. ${r.text}`))
                    ),

                    include
                      ? h(
                          'div',
                          { style: { marginLeft: 26, marginTop: 8 } },

                          h(
                            'div',
                            { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' } },
                            h(
                              'select',
                              {
                                value: row.strength || 'strong',
                                onChange: (e) => this.setReqField(ref, { strength: e.target.value }),
                                style: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' },
                              },
                              h('option', { value: 'strong' }, 'Strong'),
                              h('option', { value: 'borderline' }, 'Borderline')
                            )
                          ),

                          h('div', { style: { fontWeight: 600, marginBottom: 4 } }, 'STEM areas'),
                          h(
                            'div',
                            { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
                            AREA_OPTIONS.map((a) => {
                              const cur = Array.isArray(row.areas) ? row.areas : [];
                              const checked = cur.includes(a);
                              return h(
                                'label',
                                { key: a, style: { display: 'flex', gap: 6, alignItems: 'center' } },
                                h('input', {
                                  type: 'checkbox',
                                  checked,
                                  onChange: () => {
                                    const next = checked ? cur.filter((x) => x !== a) : cur.concat([a]);
                                    this.setReqField(ref, { areas: next });
                                  },
                                }),
                                h('span', null, a)
                              );
                            })
                          ),

                          h('div', { style: { fontWeight: 600, marginBottom: 4 } }, 'Why is it STEM? (visible on site)'),
                          h('textarea', {
                            value: row.why_stem || '',
                            onChange: (e) => this.setReqField(ref, { why_stem: e.target.value }),
                            rows: 3,
                            style: {
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(0,0,0,0.2)',
                              marginBottom: 10,
                            },
                          }),

                          h(
                            'div',
                            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            h('div', { style: { fontWeight: 600 } }, 'Leader prompts (hidden on site)'),
                            h('button', { type: 'button', onClick: () => this.addPrompt(ref) }, 'Add prompt')
                          ),

                          (Array.isArray(row.leader_prompts) ? row.leader_prompts : []).map((p, idx) =>
                            h(
                              'div',
                              { key: idx, style: { display: 'flex', gap: 8, marginTop: 6 } },
                              h('input', {
                                type: 'text',
                                value: p || '',
                                onChange: (e) => this.setPrompt(ref, idx, e.target.value),
                                placeholder: "Prompt (add age note if needed, e.g. 'Older sections: …')",
                                style: {
                                  flex: 1,
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid rgba(0,0,0,0.2)',
                                },
                              }),
                              h('button', { type: 'button', onClick: () => this.removePrompt(ref, idx) }, 'Remove')
                            )
                          )
                        )
                      : null
                  );
                })
              )
            : h('div', { style: { opacity: 0.8 } }, 'Select a badge to curate its STEM mapping.')
        );
      },
    });

    const Preview = createClass({
      render() {
        const v = toPlain(this.props.value);
        return h('div', null, v.badge_id ? `Badge: ${v.badge_id}` : 'STEM override');
      },
    });

    CMS.registerWidget('stem_override', Control, Preview);
    console.log('[stem_override] widget registered');
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (register() || tries > 200) clearInterval(timer);
  }, 100);
})();
