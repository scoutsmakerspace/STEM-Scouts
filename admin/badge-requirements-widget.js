/*
Decap CMS custom widget: badge_requirements

Goal
- User selects a badge (relation widget)
- This widget reads that selected badge ID and displays the actual requirements (text)
- User ticks requirements; we store selected requirement numbers as an array of integers

Data source (static file in repo)
- /admin/badges_master.json

Expected badge schema
- [{ id, requirements: [{ no, text }, ...] }, ...]
  OR { badges: [ ... ] }
*/

(function () {
  if (!window.CMS) return;

  const h = window.CMS.h;
  const createClass = window.CMS.createClass;

  // Cache loaded badge map across widget instances
  let badgeMapPromise = null;

  function loadBadgeMap() {
    if (badgeMapPromise) return badgeMapPromise;
    badgeMapPromise = fetch('/admin/badges_master.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load badges_master.json');
        return r.json();
      })
      .then(data => {
        const list = Array.isArray(data) ? data : (Array.isArray(data.badges) ? data.badges : []);
        const map = new Map();
        for (const b of list) {
          if (b && b.id) map.set(String(b.id), b);
        }
        return map;
      })
      .catch(err => {
        console.error('[badge_requirements] load error', err);
        return new Map();
      });
    return badgeMapPromise;
  }

  function getBadgeIdFromProps(props) {
    // Determine sibling badge field value inside a list item object.
    // props.path is typically an array describing the location of this field.
    // Example: ['data', 'badge_links', 0, 'requirements_met']
    const badgeField = props.field && props.field.get ? (props.field.get('badge_field') || 'badge') : 'badge';

    try {
      const path = props.path ? Array.from(props.path) : null;
      if (!path || path.length < 2 || !props.entry) return null;

      // Remove last segment (this field name) to get the parent object path
      const parentPath = path.slice(0, -1);
      const badgePath = parentPath.concat([badgeField]);

      // entry is an Immutable.js Map
      const badgeId = props.entry.getIn(badgePath);
      return badgeId ? String(badgeId) : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeSelected(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(v => {
          const n = typeof v === 'number' ? v : parseInt(String(v), 10);
          return Number.isFinite(n) ? n : null;
        })
        .filter(v => v !== null);
    }
    // Sometimes Decap passes Immutable List
    try {
      if (value && value.toJS) return normalizeSelected(value.toJS());
    } catch (_) {}
    return [];
  }

  const BadgeRequirementsControl = createClass({
    getInitialState() {
      return { loaded: false, badgeId: null, badge: null, map: null };
    },

    componentDidMount() {
      loadBadgeMap().then(map => {
        const badgeId = getBadgeIdFromProps(this.props);
        const badge = badgeId ? map.get(badgeId) : null;
        this.setState({ loaded: true, badgeId, badge, map });
      });
    },

    componentDidUpdate(prevProps) {
      const prevBadgeId = getBadgeIdFromProps(prevProps);
      const badgeId = getBadgeIdFromProps(this.props);
      if (prevBadgeId !== badgeId && this.state.map) {
        const badge = badgeId ? this.state.map.get(badgeId) : null;
        this.setState({ badgeId, badge });
        // Clear selections when badge changes (prevents mismatched requirements)
        this.props.onChange([]);
      }
    },

    toggleReq(reqNo) {
      const selected = new Set(normalizeSelected(this.props.value));
      if (selected.has(reqNo)) selected.delete(reqNo);
      else selected.add(reqNo);
      const next = Array.from(selected).sort((a, b) => a - b);
      this.props.onChange(next);
    },

    render() {
      const selected = new Set(normalizeSelected(this.props.value));

      if (!this.state.loaded) {
        return h('div', { className: this.props.classNameWrapper }, 'Loading badge requirements…');
      }

      if (!this.state.badgeId) {
        return h(
          'div',
          { className: this.props.classNameWrapper },
          h('em', null, 'Select a badge first to choose requirements.')
        );
      }

      const badge = this.state.badge;
      if (!badge) {
        return h(
          'div',
          { className: this.props.classNameWrapper },
          h('em', null, `Badge "${this.state.badgeId}" not found in badges_master.json.`)
        );
      }

      const reqs = Array.isArray(badge.requirements) ? badge.requirements : [];
      const numbered = reqs.filter(r => r && r.no !== null && r.no !== undefined && String(r.no).trim() !== '');

      if (numbered.length === 0) {
        return h(
          'div',
          { className: this.props.classNameWrapper },
          h('em', null, 'No numbered requirements found for this badge.')
        );
      }

      const items = numbered.map(r => {
        const n = typeof r.no === 'number' ? r.no : parseInt(String(r.no), 10);
        if (!Number.isFinite(n)) return null;
        const label = `${n}. ${r.text || ''}`.trim();
        return h(
          'label',
          { key: `req-${n}`, style: { display: 'block', marginBottom: '6px', cursor: 'pointer' } },
          h('input', {
            type: 'checkbox',
            checked: selected.has(n),
            onChange: () => this.toggleReq(n),
            style: { marginRight: '8px' },
          }),
          label
        );
      }).filter(Boolean);

      return h(
        'div',
        { className: this.props.classNameWrapper },
        h('div', { style: { marginBottom: '8px' } }, h('strong', null, 'Tick the requirements this activity supports:')),
        h('div', { style: { maxHeight: '240px', overflow: 'auto', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' } }, items),
        h('div', { style: { marginTop: '6px', fontSize: '0.9em', opacity: 0.8 } }, `Selected: ${Array.from(selected).sort((a,b)=>a-b).join(', ') || 'none'}`)
      );
    },
  });

  window.CMS.registerWidget('badge_requirements', BadgeRequirementsControl);
})();
