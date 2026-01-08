(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  let _idx = null;
  let _loading = null;

  async function loadBadgesIndex() {
    if (_idx) return _idx;
    if (_loading) return _loading;

    _loading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const arr = Array.isArray(json) ? json : (Array.isArray(json.badges) ? json.badges : []);
        const idx = {};
        for (const b of arr) {
          if (b && b.id) idx[b.id] = b;
        }
        _idx = idx;
        console.log("[badge_requirements] loaded badges:", Object.keys(_idx).length);
        return _idx;
      })
      .catch((e) => {
        console.error("[badge_requirements] load failed:", e);
        _idx = {};
        return _idx;
      });

    return _loading;
  }

  function listIndexFromPath(path) {
    // Example: "badge_links.0.requirements_met"
    const m = String(path || "").match(/badge_links\.(\d+)\./);
    return m ? parseInt(m[1], 10) : null;
  }

  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return { loading: true, badgeId: null, reqs: [], error: null };
      },

      async componentDidMount() {
        await this.refresh();
      },

      async componentDidUpdate(prevProps) {
        const prev = this.getBadgeId(prevProps);
        const curr = this.getBadgeId(this.props);
        if (prev !== curr) await this.refresh();
      },

      getBadgeId(props) {
        try {
          const i = listIndexFromPath(props.path);
          if (i === null) return null;
          // field inside badge_links item is named "badge"
          return props.entry.getIn(["data", "badge_links", i, "badge"]) || null;
        } catch {
          return null;
        }
      },

      async refresh() {
        this.setState({ loading: true, error: null });

        const badgeId = this.getBadgeId(this.props);
        const idx = await loadBadgesIndex();

        const badge = badgeId ? idx[badgeId] : null;

        console.log("[badge_requirements] selected badge:", badgeId, "found:", !!badge);

        // Requirements should be an array like: [{ id:"1", text:"..."}, ...]
        const reqs = badge && Array.isArray(badge.requirements) ? badge.requirements : [];

        // current value: list of selected requirement ids (strings)
        const current = Array.isArray(this.props.value) ? this.props.value : [];

        // allow only requirement ids that exist on this badge
        const allowed = new Set(reqs.map(r => String(r.id)));

        const cleaned = current.filter(v => allowed.has(String(v)));
        if (JSON.stringify(cleaned) !== JSON.stringify(current)) {
          this.props.onChange(cleaned);
        }

        this.setState({ loading: false, badgeId, reqs });
      },

      toggle(reqId) {
        const id = String(reqId);
        const v = Array.isArray(this.props.value) ? this.props.value.map(String) : [];
        const i = v.indexOf(id);
        if (i >= 0) v.splice(i, 1);
        else v.push(id);
        // stable sort: numeric-ish then lexicographic
        v.sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b);
          if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
          return a.localeCompare(b);
        });
        this.props.onChange(v);
      },

      render() {
        const value = Array.isArray(this.props.value) ? this.props.value.map(String) : [];

        if (this.state.loading) {
          return h("div", { className: this.props.classNameWrapper }, "Loading requirements…");
        }

        if (!this.state.badgeId) {
          return h("div", { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "Pick a badge first to see its requirements.");
        }

        if (!this.state.reqs.length) {
          return h("div", { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "No numbered requirements found for this badge (check badges_master.json extraction).");
        }

        return h(
          "div",
          { className: this.props.classNameWrapper },
          h("div", { style: { marginBottom: "0.5rem", opacity: 0.85 } },
            "Tick the requirements this activity supports:"),
          h("div", {
            style: {
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              maxHeight: 320,
              overflow: "auto",
            }
          },
            this.state.reqs.map((r) =>
              h("label", {
                key: String(r.id),
                style: { display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.35rem 0" }
              },
                h("input", {
                  type: "checkbox",
                  checked: value.includes(String(r.id)),
                  onChange: () => this.toggle(r.id),
                  style: { marginTop: 3 }
                }),
                h("div", null,
                  h("div", { style: { fontWeight: 600 } }, `${r.id}.`),
                  h("div", null, r.text)
                )
              )
            )
          )
        );
      }
    });

    const Preview = createClass({
      render() {
        const v = Array.isArray(this.props.value) ? this.props.value : [];
        return h("div", null, v.length ? `Selected: ${v.join(", ")}` : "No requirements selected");
      }
    });

    CMS.registerWidget("badge_requirements", Control, Preview);
    console.log("[badge_requirements] widget registered");
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    if (register() || tries > 80) clearInterval(t);
  }, 100);
})();
