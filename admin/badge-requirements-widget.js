(function () {
  // Guard: wait until Decap exposes helpers
  function getHelpers() {
    return {
      CMS: window.CMS,
      createClass: window.createClass,
      h: window.h,
    };
  }

  // Cache badge data (loaded once)
  let _badgeIndex = null;
  let _loading = null;

  async function loadBadges() {
    if (_badgeIndex) return _badgeIndex;
    if (_loading) return _loading;

    // IMPORTANT: relative path so it works under /STEM-Scouts/admin/
    _loading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load badges_master.json (${r.status})`);
        return r.json();
      })
      .then((arr) => {
        const idx = {};
        (arr || []).forEach((b) => {
          if (b && b.id) idx[b.id] = b;
        });
        _badgeIndex = idx;
        return _badgeIndex;
      })
      .catch((err) => {
        console.error("[badge_requirements] loadBadges error:", err);
        _badgeIndex = {};
        return _badgeIndex;
      });

    return _loading;
  }

  function getListIndexFromPath(path) {
    // Example: "badge_links.0.requirements_met"
    if (!path) return null;
    const m = String(path).match(/badge_links\.(\d+)\./);
    return m ? parseInt(m[1], 10) : null;
  }

  function registerWidget() {
    const { CMS, createClass, h } = getHelpers();
    if (!CMS || !createClass || !h) return false;

    const BadgeRequirementsControl = createClass({
      getInitialState() {
        return { loading: true, badgeId: null, requirements: [] };
      },

      async componentDidMount() {
        await this.refreshFromEntry();
      },

      async componentDidUpdate(prevProps) {
        const prevBadge = this.getSelectedBadgeId(prevProps);
        const currBadge = this.getSelectedBadgeId(this.props);
        if (prevBadge !== currBadge) {
          await this.refreshFromEntry();
        }
      },

      getSelectedBadgeId(props) {
        try {
          const idx = getListIndexFromPath(props.path);
          if (idx === null) return null;
          return props.entry.getIn(["data", "badge_links", idx, "badge"]) || null;
        } catch {
          return null;
        }
      },

      async refreshFromEntry() {
        this.setState({ loading: true });

        const badgeId = this.getSelectedBadgeId(this.props);
        const idx = await loadBadges();
        const badge = badgeId ? idx[badgeId] : null;

        const reqs = badge && Array.isArray(badge.requirements) ? badge.requirements : [];

        // current value is an array of ints (selected requirement numbers)
        const current = Array.isArray(this.props.value) ? this.props.value : [];
        const allowed = new Set(reqs.map((r) => r.no).filter((n) => Number.isInteger(n)));

        // Clean any invalid stored numbers
        const cleaned = current.filter((n) => allowed.has(n));
        if (JSON.stringify(current) !== JSON.stringify(cleaned)) {
          this.props.onChange(cleaned);
        }

        this.setState({ loading: false, badgeId, requirements: reqs });
      },

      onToggle(no) {
        const v = Array.isArray(this.props.value) ? this.props.value.slice() : [];
        const i = v.indexOf(no);
        if (i >= 0) v.splice(i, 1);
        else v.push(no);
        v.sort((a, b) => a - b);
        this.props.onChange(v);
      },

      render() {
        const value = Array.isArray(this.props.value) ? this.props.value : [];

        if (this.state.loading) {
          return h("div", { className: this.props.classNameWrapper }, "Loading requirements…");
        }

        if (!this.state.badgeId) {
          return h(
            "div",
            { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "Pick a badge first to see its requirements."
          );
        }

        const reqs = this.state.requirements || [];
        if (!reqs.length) {
          return h(
            "div",
            { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "No numbered requirements found for this badge."
          );
        }

        return h(
          "div",
          { className: this.props.classNameWrapper },
          h("div", { style: { marginBottom: "0.5rem", opacity: 0.85 } }, "Tick the requirements this activity supports:"),
          h(
            "div",
            {
              style: {
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                padding: "0.5rem 0.75rem",
                maxHeight: 320,
                overflow: "auto",
              },
            },
            reqs.map((r) =>
              h(
                "label",
                {
                  key: String(r.no),
                  style: { display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.35rem 0" },
                },
                h("input", {
                  type: "checkbox",
                  checked: value.includes(r.no),
                  onChange: () => this.onToggle(r.no),
                  style: { marginTop: 3 },
                }),
                h("div", null,
                  h("div", { style: { fontWeight: 600 } }, `${r.no}.`),
                  h("div", null, r.text)
                )
              )
            )
          )
        );
      },
    });

    const BadgeRequirementsPreview = createClass({
      render() {
        const v = Array.isArray(this.props.value) ? this.props.value : [];
        return h("div", null, v.length ? `Requirements: ${v.join(", ")}` : "No requirements selected");
      },
    });

    CMS.registerWidget("badge_requirements", BadgeRequirementsControl, BadgeRequirementsPreview);
    console.log("[badge_requirements] widget registered");
    return true;
  }

  // Decap loads async; retry a bit
  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    if (registerWidget() || tries > 60) clearInterval(t);
  }, 100);
})();
