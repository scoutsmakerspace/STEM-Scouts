(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ---------- Load badges master ----------
  let _badges = null;
  let _loading = null;

  async function loadBadges() {
    if (_badges) return _badges;
    if (_loading) return _loading;

    _loading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const arr = Array.isArray(json) ? json : (Array.isArray(json.badges) ? json.badges : []);
        // Precompute display text for searching
        _badges = (arr || []).map((b) => ({
          id: b.id,
          section: b.section,
          category: b.category,
          title: b.badge_name || b.badge || b.title || b.id,
          requirements: Array.isArray(b.requirements) ? b.requirements : [],
          _display: `${b.section || ""} — ${(b.badge_name || b.title || b.id) || ""} — ${b.category || ""}`.trim(),
        }));
        console.log("[badge_link] loaded badges:", _badges.length);
        return _badges;
      })
      .catch((e) => {
        console.error("[badge_link] load failed:", e);
        _badges = [];
        return _badges;
      });

    return _loading;
  }

  function byId(list, id) {
    return list.find((b) => b.id === id) || null;
  }

  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return {
          loading: true,
          badges: [],
          query: "",
          selectedId: null,
          notes: "",
          reqsSelected: [],
        };
      },

      async componentDidMount() {
        const badges = await loadBadges();
        this.setState({ badges, loading: false });
        this.hydrateFromValue(this.props.value);
      },

      componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value) {
          this.hydrateFromValue(this.props.value);
        }
      },

      hydrateFromValue(value) {
        const v = value && typeof value === "object" ? value : {};
        const selectedId = v.badge_id || v.badge || null;
        const notes = v.notes || "";
        const reqsSelected = Array.isArray(v.requirements_met) ? v.requirements_met.map(String) : [];

        // Avoid unnecessary re-renders
        if (
          selectedId === this.state.selectedId &&
          notes === this.state.notes &&
          JSON.stringify(reqsSelected) === JSON.stringify(this.state.reqsSelected)
        ) {
          return;
        }

        this.setState({ selectedId, notes, reqsSelected });
      },

      emitChange(next) {
        // Store a compact object, plus a friendly title for list summary
        const badges = this.state.badges;
        const b = next.badge_id ? byId(badges, next.badge_id) : null;

        const out = {
          badge_id: next.badge_id || null,
          badge_title: b ? b._display : "",
          requirements_met: Array.isArray(next.requirements_met) ? next.requirements_met : [],
          notes: next.notes || "",
        };

        this.props.onChange(out);
      },

      setBadge(id) {
        const badge_id = id || null;
        // reset requirements when badge changes
        this.emitChange({ badge_id, requirements_met: [], notes: this.state.notes });
        this.setState({ selectedId: badge_id, reqsSelected: [] });
      },

      toggleReq(reqId) {
        const id = String(reqId);
        const cur = this.state.reqsSelected.slice();
        const i = cur.indexOf(id);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(id);

        // stable sort numeric-ish
        cur.sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b);
          if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
          return a.localeCompare(b);
        });

        this.setState({ reqsSelected: cur });
        this.emitChange({ badge_id: this.state.selectedId, requirements_met: cur, notes: this.state.notes });
      },

      setNotes(txt) {
        this.setState({ notes: txt });
        this.emitChange({ badge_id: this.state.selectedId, requirements_met: this.state.reqsSelected, notes: txt });
      },

      render() {
        if (this.state.loading) {
          return h("div", { className: this.props.classNameWrapper }, "Loading badges…");
        }

        const badges = this.state.badges;
        const selected = this.state.selectedId ? byId(badges, this.state.selectedId) : null;

        // Simple search (client side)
        const q = (this.state.query || "").trim().toLowerCase();
        const filtered = q
          ? badges.filter((b) => (b._display || "").toLowerCase().includes(q))
          : badges;

        return h(
          "div",
          { className: this.props.classNameWrapper, style: { border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: 12 } },

          h("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 } },
            h("input", {
              type: "text",
              placeholder: "Search badge (e.g. 'beavers builder' or 'staged')…",
              value: this.state.query,
              onChange: (e) => this.setState({ query: e.target.value }),
              style: { flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)" }
            })
          ),

          h("div", { style: { marginBottom: 10 } },
            h("select", {
              value: this.state.selectedId || "",
              onChange: (e) => this.setBadge(e.target.value),
              style: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)" }
            },
              h("option", { value: "" }, "Select a badge…"),
              (() => {
              const groups = {};
              for (const b of filtered) {
                const k = (b.section || "other").toLowerCase();
                if (!groups[k]) groups[k] = [];
                groups[k].push(b);
              }
            
              const order = ["universal", "squirrels", "beavers", "cubs", "scouts", "explorers", "other"];
              const keys = order.filter(k => groups[k] && groups[k].length).concat(
                Object.keys(groups).filter(k => !order.includes(k))
              );
            
              return keys.map((k) =>
                h("optgroup", { key: k, label: k.charAt(0).toUpperCase() + k.slice(1) },
                  groups[k].map((b) => h("option", { key: b.id, value: b.id }, b._display))
                )
              );
            })()

            )
          ),

          selected
            ? h(
                "div",
                null,
                h("div", { style: { margin: "8px 0 6px", fontWeight: 600 } }, "Requirements (tick what this activity covers):"),
                h(
                  "div",
                  {
                    style: {
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      maxHeight: 260,
                      overflow: "auto",
                      marginBottom: 10,
                    },
                  },
                  (selected.requirements || []).length
                    ? selected.requirements.map((r) =>
                        h(
                          "label",
                          { key: String(r.id), style: { display: "flex", gap: 8, padding: "6px 0", alignItems: "flex-start" } },
                          h("input", {
                            type: "checkbox",
                            checked: this.state.reqsSelected.includes(String(r.id)),
                            onChange: () => this.toggleReq(r.id),
                            style: { marginTop: 3 },
                          }),
                          h("div", null,
                            h("div", { style: { fontWeight: 600 } }, `${r.id}.`),
                            h("div", null, r.text)
                          )
                        )
                      )
                    : h("div", { style: { opacity: 0.8 } }, "No numbered requirements found for this badge.")
                )
              )
            : h("div", { style: { opacity: 0.8, marginBottom: 10 } }, "Pick a badge to see its requirements."),

          h("div", { style: { fontWeight: 600, marginBottom: 6 } }, "Notes (optional)"),
          h("textarea", {
            value: this.state.notes,
            onChange: (e) => this.setNotes(e.target.value),
            rows: 3,
            style: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)" }
          })
        );
      },
    });

    const Preview = createClass({
      render() {
        const v = this.props.value || {};
        const title = v.badge_title || v.badge_id || "Badge link";
        return h("div", null, title);
      },
    });

    CMS.registerWidget("badge_link", Control, Preview);
    console.log("[badge_link] widget registered");
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    if (register() || tries > 120) clearInterval(t);
  }, 100);
})();
