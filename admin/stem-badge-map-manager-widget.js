/*
  STEM Badge Map Manager (Decap CMS custom widget)

  Goals:
  - Deterministic add/remove (single YAML file, no per-badge files)
  - Show ALL badges + ALL requirements (expand/collapse)
  - Clear publish state per requirement
  - Manual "Import existing mapping" button to seed from the legacy JSON

  Data model stored in _data/stem_badge_map.yml:
    badges:
      - badge_id, title, section, section_slug, category, badge_type
        stem_requirements: [{ ref, rid, text, strength, areas, why_stem, leader_prompts }]
*/

(function () {
  const CMS = window.CMS;
  const React = window.React;

  if (!CMS || !React) return;

  function getBasePath() {
    // e.g. /STEM-Scouts/admin/ -> /STEM-Scouts
    const p = window.location.pathname || '';
    const idx = p.indexOf('/admin');
    return idx >= 0 ? p.slice(0, idx) : '';
  }

  function norm(s) {
    return String(s || '').toLowerCase();
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function parseAreas(raw) {
    if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
    return String(raw || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function promptsToText(prompts) {
    return Array.isArray(prompts) ? prompts.join('\n') : '';
  }

  function textToPrompts(s) {
    return String(s || '')
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  class StemBadgeMapManagerControl extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        loading: true,
        importing: false,
        error: null,
        q: '',
        open: {},
        masterBadges: [],
        // current mapping array (value of the "badges" field)
        mapBadges: Array.isArray(props.value) ? props.value : [],
      };
    }

    componentDidMount() {
      this.loadMaster();
    }

    componentDidUpdate(prevProps) {
      // Keep in sync if CMS updates the value externally
      if (prevProps.value !== this.props.value) {
        this.setState({ mapBadges: Array.isArray(this.props.value) ? this.props.value : [] });
      }
    }

    async loadMaster() {
      try {
        // badges_master.json lives in /admin/
        const r = await fetch('./badges_master.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('Failed to load badges_master.json');
        const raw = await r.json();
        // normalise to the fields we need
        const master = (Array.isArray(raw) ? raw : []).map(b => {
          const badge_id = b.id;
          const title = b.badge_name;
          const section = b.section_label || b.section || '';
          const section_slug = b.section || '';
          const category = b.category || '';
          const badge_type = b.type || '';
          const reqs = (b.requirements || [])
            .filter(rq => rq && rq.kind === 'req')
            .map(rq => ({
              ref: String(rq.no || rq.id || '').trim(),
              text: String(rq.text || '').trim(),
            }))
            .filter(rq => rq.ref);

          return { badge_id, title, section, section_slug, category, badge_type, requirements: reqs };
        }).filter(b => b.badge_id && b.title);

        this.setState({ masterBadges: master, loading: false, error: null });
      } catch (e) {
        this.setState({ loading: false, error: String(e && e.message ? e.message : e) });
      }
    }

    // ---------- mapping helpers ----------

    getMapBadge(badge_id) {
      return (this.state.mapBadges || []).find(b => b && b.badge_id === badge_id) || null;
    }

    setMapBadges(next) {
      const cleaned = Array.isArray(next) ? next : [];
      this.setState({ mapBadges: cleaned });
      // Store only the badges array (field is named "badges")
      this.props.onChange(cleaned);
    }

    toggleOpen(badge_id) {
      this.setState(prev => ({
        open: { ...prev.open, [badge_id]: !prev.open[badge_id] }
      }));
    }

    upsertRequirement(masterBadge, ref, patch) {
      const badge_id = masterBadge.badge_id;
      const prevBadge = this.getMapBadge(badge_id);
      const stem = prevBadge && Array.isArray(prevBadge.stem_requirements) ? prevBadge.stem_requirements.slice() : [];
      const idx = stem.findIndex(r => String(r.ref) === String(ref));

      const baseReqText = (masterBadge.requirements.find(r => String(r.ref) === String(ref)) || {}).text || '';
      const nextReq = {
        rid: badge_id + '::' + String(ref),
        ref: String(ref),
        text: baseReqText,
        strength: 'borderline',
        areas: [],
        why_stem: '',
        leader_prompts: [],
        ...(idx >= 0 ? stem[idx] : {}),
        ...patch,
      };

      if (idx >= 0) stem[idx] = nextReq; else stem.push(nextReq);

      // Sort by numeric ref if possible
      stem.sort((a, b) => {
        const na = parseFloat(a.ref);
        const nb = parseFloat(b.ref);
        if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
        return String(a.ref).localeCompare(String(b.ref));
      });

      const nextBadge = {
        badge_id,
        title: masterBadge.title,
        section: masterBadge.section,
        section_slug: masterBadge.section_slug,
        category: masterBadge.category,
        badge_type: masterBadge.badge_type,
        stem_requirements: stem,
      };

      const nextAll = (this.state.mapBadges || []).filter(b => b && b.badge_id !== badge_id);
      nextAll.push(nextBadge);
      nextAll.sort((a, b) => (a.section || '').localeCompare(b.section || '') || (a.title || '').localeCompare(b.title || ''));
      this.setMapBadges(nextAll);
    }

    removeRequirement(badge_id, ref) {
      const prevBadge = this.getMapBadge(badge_id);
      if (!prevBadge) return;
      const stem = Array.isArray(prevBadge.stem_requirements) ? prevBadge.stem_requirements : [];
      const nextStem = stem.filter(r => String(r.ref) !== String(ref));

      let nextAll = (this.state.mapBadges || []).filter(b => b && b.badge_id !== badge_id);
      if (nextStem.length) {
        nextAll.push({ ...prevBadge, stem_requirements: nextStem });
      }
      nextAll.sort((a, b) => (a.section || '').localeCompare(b.section || '') || (a.title || '').localeCompare(b.title || ''));
      this.setMapBadges(nextAll);
    }

    // ---------- import ----------

    async importLegacy() {
      try {
        this.setState({ importing: true, error: null });
        const base = getBasePath();
        const url = window.location.origin + base + '/assets/data/stem_badge_map.json';
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('Could not fetch legacy map from ' + url);
        const legacy = await r.json();
        const legacyBadges = (legacy && Array.isArray(legacy.badges)) ? legacy.badges : [];
        // We only import the curated subset, untouched.
        this.setMapBadges(legacyBadges);
        this.setState({ importing: false });
      } catch (e) {
        this.setState({ importing: false, error: String(e && e.message ? e.message : e) });
      }
    }

    renderBadgeRow(masterBadge) {
      const mapped = this.getMapBadge(masterBadge.badge_id);
      const mappedReqs = mapped && Array.isArray(mapped.stem_requirements) ? mapped.stem_requirements : [];
      const mappedCount = mappedReqs.length;
      const isOpen = !!this.state.open[masterBadge.badge_id];

      const headerStyle = {
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: mappedCount ? '#e9f7ec' : '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        marginBottom: '6px'
      };

      const title = `${masterBadge.section_slug ? masterBadge.section_slug.charAt(0).toUpperCase() + masterBadge.section_slug.slice(1) : masterBadge.section} — ${masterBadge.title}`;

      return React.createElement('div', { key: masterBadge.badge_id, style: { marginBottom: '10px' } },
        React.createElement('div', {
          style: headerStyle,
          onClick: () => this.toggleOpen(masterBadge.badge_id)
        },
          React.createElement('div', null,
            React.createElement('strong', null, title),
            React.createElement('div', { style: { fontSize: '12px', color: '#666' } },
              [masterBadge.category, masterBadge.badge_type].filter(Boolean).join(' · ')
            )
          ),
          React.createElement('div', { style: { fontSize: '12px', color: mappedCount ? '#1a7f37' : '#666' } },
            mappedCount ? `✓ ${mappedCount} mapped` : '—'
          )
        ),
        isOpen ? this.renderRequirements(masterBadge, mappedReqs) : null
      );
    }

    renderRequirements(masterBadge, mappedReqs) {
      const mappedByRef = new Map(mappedReqs.map(r => [String(r.ref), r]));
      const boxStyle = { padding: '10px 12px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' };

      const rows = masterBadge.requirements.map(rq => {
        const ref = String(rq.ref);
        const mapped = mappedByRef.get(ref) || null;
        const published = !!mapped;

        const rowHead = React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' } },
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontWeight: 600 } }, `${ref}. ${rq.text}`)
          ),
          React.createElement('button', {
            type: 'button',
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (published) this.removeRequirement(masterBadge.badge_id, ref);
              else this.upsertRequirement(masterBadge, ref, {});
            },
            style: {
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: published ? '#fff' : '#1a73e8',
              color: published ? '#333' : '#fff',
              cursor: 'pointer'
            }
          }, published ? 'Remove' : 'Add')
        );

        if (!published) {
          return React.createElement('div', { key: ref, style: { padding: '10px 0', borderBottom: '1px solid #eee' } }, rowHead);
        }

        const strength = mapped.strength || 'borderline';
        const areasStr = (mapped.areas || []).join(', ');
        const why = mapped.why_stem || '';
        const prompts = promptsToText(mapped.leader_prompts || []);

        const fieldRow = (label, inputEl) => React.createElement('div', { style: { marginTop: '8px' } },
          React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, marginBottom: '4px' } }, label),
          inputEl
        );

        const strengthSelect = React.createElement('select', {
          value: strength,
          onChange: (e) => this.upsertRequirement(masterBadge, ref, { strength: e.target.value }),
          style: { width: '220px', padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }
        },
          React.createElement('option', { value: 'strong' }, 'Strong'),
          React.createElement('option', { value: 'borderline' }, 'Borderline')
        );

        const areasInput = React.createElement('input', {
          type: 'text',
          value: areasStr,
          placeholder: 'Engineering & design, Digital, Science, ...',
          onChange: (e) => this.upsertRequirement(masterBadge, ref, { areas: parseAreas(e.target.value) }),
          style: { width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }
        });

        const whyInput = React.createElement('textarea', {
          value: why,
          rows: 3,
          onChange: (e) => this.upsertRequirement(masterBadge, ref, { why_stem: e.target.value }),
          style: { width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }
        });

        const promptsInput = React.createElement('textarea', {
          value: prompts,
          rows: 3,
          placeholder: 'One prompt per line…',
          onChange: (e) => this.upsertRequirement(masterBadge, ref, { leader_prompts: textToPrompts(e.target.value) }),
          style: { width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }
        });

        const details = React.createElement('div', { style: { marginTop: '10px', paddingLeft: '12px' } },
          fieldRow('STEM link strength', strengthSelect),
          fieldRow('STEM areas (comma-separated)', areasInput),
          fieldRow('Why STEM (short justification)', whyInput),
          fieldRow('Leader prompts (one per line)', promptsInput)
        );

        return React.createElement('div', { key: ref, style: { padding: '10px 0', borderBottom: '1px solid #eee' } },
          rowHead,
          details
        );
      });

      return React.createElement('div', { style: boxStyle }, rows);
    }

    render() {
      const { loading, error, q, masterBadges, mapBadges, importing } = this.state;

      if (loading) {
        return React.createElement('div', null, 'Loading badge database…');
      }

      const mappedCount = (Array.isArray(mapBadges) ? mapBadges.length : 0);
      const header = React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('div', { style: { fontSize: '14px', color: '#555', marginBottom: '8px' } },
          'Search a badge, expand it, then Add/Remove individual requirements. This is a single-source mapping (no per-badge files), so it saves reliably.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          React.createElement('input', {
            type: 'search',
            value: q,
            placeholder: 'Search badge name or requirement text…',
            onChange: (e) => this.setState({ q: e.target.value }),
            style: { flex: '1 1 320px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ccc' }
          }),
          React.createElement('button', {
            type: 'button',
            onClick: (e) => { e.preventDefault(); this.importLegacy(); },
            disabled: importing,
            style: {
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: importing ? 'default' : 'pointer'
            }
          }, importing ? 'Importing…' : 'Import existing mapping'),
          React.createElement('span', { style: { fontSize: '12px', color: '#666' } },
            mappedCount ? `${mappedCount} badges currently mapped` : 'No mapped badges yet'
          )
        ),
        error ? React.createElement('div', { style: { marginTop: '8px', color: '#b00020', fontSize: '12px' } }, error) : null
      );

      const qn = norm(q).trim();
      const filtered = masterBadges.filter(b => {
        if (!qn) return true;
        if (norm(b.title).includes(qn)) return true;
        return b.requirements.some(r => norm(r.text).includes(qn));
      });

      return React.createElement('div', { style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' } },
        header,
        filtered.map(b => this.renderBadgeRow(b))
      );
    }
  }

  CMS.registerWidget('stem_badge_map_manager', StemBadgeMapManagerControl);
})();
