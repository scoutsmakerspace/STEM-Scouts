(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // Simple, safe badges manager. Stores ONLY override/new badges in a single YAML file.
  // A separate script converts these overrides into _badges/*.md and regenerates badges_master.json.

  const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function toPlain(v) {
    let out = v;
    if (out && typeof out.get === "function") {
      try { out = out.toJS(); } catch (e) { out = null; }
    }
    return out;
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o || {}));
  }

  function uniqById(arr) {
    const seen = new Set();
    const out = [];
    (arr || []).forEach((b) => {
      if (!b) return;
      const id = String(b.id || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(b);
    });
    return out;
  }

  // Load current published badge list for context/search
  let _master = null;
  let _masterLoading = null;

  async function loadMaster() {
    if (_master) return _master;
    if (_masterLoading) return _masterLoading;
    _masterLoading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => {
        _master = Array.isArray(json) ? json : [];
        return _master;
      })
      .catch((e) => {
        console.warn("[badges_manager] badges_master.json not available", e);
        _master = [];
        return _master;
      });
    return _masterLoading;
  }

  const SECTION_OPTIONS = [
    { value: "squirrels", label: "Squirrels" },
    { value: "beavers", label: "Beavers" },
    { value: "cubs", label: "Cubs" },
    { value: "scouts", label: "Scouts" },
    { value: "explorers", label: "Explorers" },
    { value: "staged", label: "Staged" },
  ];

  const CATEGORY_OPTIONS = [
    "Activity Badges",
    "Core Badges",
    "Staged Activity Badges",
    "Challenge Awards",
  ];

  const BADGE_TYPE_OPTIONS = [
    "Activity",
    "Staged Activity",
    "Challenge Award",
    "Leadership",
    "Earth Tribe",
  ];

  const Control = window.createClass({
    getInitialState() {
      return {
        master: [],
        loading: true,
        q: "",
        editing: null,
        err: "",
      };
    },

    async componentDidMount() {
      const master = await loadMaster();
      this.setState({ master: master || [], loading: false });
    },

    getValueObj() {
      const v = toPlain(this.props.value);
      if (v && typeof v === "object") return v;
      return { badges: [] };
    },

    getOverrides() {
      const obj = this.getValueObj();
      const arr = Array.isArray(obj.badges) ? obj.badges : [];
      return uniqById(
        arr.map((b) => {
          const bb = b || {};
          return {
            id: String(bb.id || "").trim(),
            title: String(bb.title || "").trim(),
            status: (String(bb.status || "active").trim() || "active").toLowerCase(),
            section: String(bb.section || "").trim(),
            category: String(bb.category || "").trim(),
            badge_type: String(bb.badge_type || "").trim(),
            icon: String(bb.icon || "").trim(),
            requirements: Array.isArray(bb.requirements) ? bb.requirements : [],
          };
        })
      );
    },

    setOverrides(next) {
      this.props.onChange({ badges: uniqById(next || []) });
    },

    addNew() {
      const overrides = this.getOverrides();
      const used = new Set([
        ...overrides.map((o) => o.id),
        ...(this.state.master || []).map((b) => b.id),
      ]);

      let id = "new-badge";
      let n = 1;
      while (used.has(id)) {
        n += 1;
        id = `new-badge-${n}`;
      }

      this.setState({
        editing: {
          id,
          title: "",
          status: "active",
          section: "",
          category: "",
          badge_type: "",
          icon: "",
          requirements: [],
          _id_touched: false,
        },
        err: "",
      });
    },

    startEdit(row) {
      const base = row.ovr || {
        id: row.id,
        title: row.title,
        status: row.status,
        section: row.section,
        category: row.category,
        badge_type: row.badge_type,
        icon: "",
        requirements: [],
            // Editing an existing badge: treat ID as "touched" so title edits don't auto-regenerate the canonical id.
            _id_touched: true,
      };
      // NOTE: the _id_touched trick above avoids older JS minifier oddities; will be overwritten below
      base._id_touched = true;
      this.setState({ editing: clone(base), err: "" });
    },

    cancelEdit() {
      this.setState({ editing: null, err: "" });
    },

    saveEdit() {
      const ed = this.state.editing || {};
      const id = String(ed.id || "").trim();
      const title = String(ed.title || "").trim();
      const status = (String(ed.status || "active").trim() || "active").toLowerCase();

      if (!id || !ID_RE.test(id)) {
        this.setState({ err: "ID must be kebab-case (lowercase letters, numbers, hyphens)." });
        return;
      }
      if (!title) {
        this.setState({ err: "Title is required." });
        return;
      }
      if (status !== "active" && status != "retired"):
        pass
      if (status !== "active" && status !== "retired") {
        this.setState({ err: "Status must be active or retired." });
        return;
      }

      const overrides = this.getOverrides();
      const idx = overrides.findIndex((x) => x.id === id);
      const next = overrides.slice();
      const cleaned = {
        id,
        title,
        status,
        section: String(ed.section || "").trim(),
        category: String(ed.category || "").trim(),
        badge_type: String(ed.badge_type || "").trim(),
        icon: String(ed.icon || "").trim(),
        requirements: Array.isArray(ed.requirements) ? ed.requirements : [],
      };

      if (idx >= 0) next[idx] = cleaned;
      else next.push(cleaned);

      this.setOverrides(next);
      this.setState({ editing: null, err: "" });
    },

    retire(row) {
      const id = String(row.id || "").trim();
      if (!id) return;
      const overrides = this.getOverrides();
      const idx = overrides.findIndex((x) => x.id === id);
      const next = overrides.slice();
      if (idx >= 0) next[idx] = { ...next[idx], status: "retired" };
      else {
        next.push({
          id,
          title: row.title || id,
          status: "retired",
          section: row.section || "",
          category: row.category || "",
          badge_type: row.badge_type || "",
          icon: "",
          requirements: [],
        });
      }
      this.setOverrides(next);
    },

    unretire(row) {
      const id = String(row.id || "").trim();
      const overrides = this.getOverrides();
      const idx = overrides.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const next = overrides.slice();
      next[idx] = { ...next[idx], status: "active" };
      this.setOverrides(next);
    },

    removeOverride(row) {
      const id = String(row.id || "").trim();
      const overrides = this.getOverrides().filter((x) => x.id !== id);
      this.setOverrides(overrides);
    },

    renderSelect(value, options, onChange) {
      const h = window.h;
      return h(
        "select",
        { value: value || "", onChange: (e) => onChange(e.target.value), style: { padding: "6px", minWidth: "220px" } },
        [h("option", { value: "" }, "—")].concat(
          options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const label = typeof opt === "string" ? opt : opt.label;
            return h("option", { value: v }, label);
          })
        )
      );
    },

    render() {
      const h = window.h;
      const overrides = this.getOverrides();
      const byId = {};
      overrides.forEach((o) => (byId[o.id] = o));

      const q = String(this.state.q || "").toLowerCase().trim();
      const master = (this.state.master || []).slice();

      const rows = [];
      master.forEach((b) => {
        const ovr = byId[b.id] || null;
        const title = (ovr && ovr.title) || b.badge_name || b.title || b.id;
        const section = (ovr && ovr.section) || b.section || "";
        const category = (ovr && ovr.category) || b.category || "";
        const badge_type = (ovr && ovr.badge_type) || b.type || "";
        const status = (ovr && ovr.status) || "active";
        const hay = `${b.id} ${title} ${section} ${category} ${badge_type} ${status}`.toLowerCase();
        if (q && !hay.includes(q)) return;
        rows.push({ id: b.id, title, section, category, badge_type, status, ovr });
      });

      // Include overrides that are not yet in master (brand new badges)
      overrides.forEach((o) => {
        if (master.find((b) => b.id === o.id)) return;
        const hay = `${o.id} ${o.title} ${o.section} ${o.category} ${o.badge_type} ${o.status}`.toLowerCase();
        if (q && !hay.includes(q)) return;
        rows.push({ id: o.id, title: o.title || o.id, section: o.section, category: o.category, badge_type: o.badge_type, status: o.status, ovr: o });
      });

      rows.sort((a, b) => a.id.localeCompare(b.id));

      const editing = this.state.editing;

      return h("div", { style: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" } }, [
        h("div", { style: { marginBottom: "12px" } }, [
          h("strong", null, "Badges Manager"),
          h("div", { style: { color: "#666", fontSize: "12px" } }, "Use this page to add new badges and retire badges safely. Deletion is not supported."),
        ]),

        h("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" } }, [
          h("input", { type: "text", placeholder: "Search…", value: this.state.q, onChange: (e) => this.setState({ q: e.target.value }), style: { padding: "8px", minWidth: "320px" } }),
          h("button", { type: "button", onClick: () => this.addNew(), style: { padding: "8px 10px" } }, "Add new badge"),
          h("span", { style: { color: "#666" } }, `Overrides: ${overrides.length}`),
        ]),

        h("div", { style: { border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" } }, [
          h("div", { style: { display: "grid", gridTemplateColumns: "180px 1fr 120px 220px 180px 90px 240px", background: "#f7f7f7", padding: "8px", fontWeight: 600 } }, [
            h("div", null, "ID"),
            h("div", null, "Title"),
            h("div", null, "Section"),
            h("div", null, "Category"),
            h("div", null, "Badge type"),
            h("div", null, "Status"),
            h("div", null, "Actions"),
          ]),

          rows.slice(0, 400).map((r) =>
            h("div", { key: r.id, style: { display: "grid", gridTemplateColumns: "180px 1fr 120px 220px 180px 90px 240px", padding: "8px", borderTop: "1px solid #eee", alignItems: "center", background: r.status === "retired" ? "#fff5f5" : "white" } }, [
              h("div", { style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "12px" } }, r.id),
              h("div", null, r.title),
              h("div", null, r.section),
              h("div", null, r.category),
              h("div", null, r.badge_type),
              h("div", null, r.status),
              h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } }, [
                h("button", { type: "button", onClick: () => this.startEdit(r), style: { padding: "6px 8px" } }, "Edit"),
                r.status !== "retired"
                  ? h("button", { type: "button", onClick: () => this.retire(r), style: { padding: "6px 8px" } }, "Retire")
                  : h("button", { type: "button", onClick: () => this.unretire(r), style: { padding: "6px 8px" } }, "Unretire"),
                r.ovr ? h("button", { type: "button", onClick: () => this.removeOverride(r), style: { padding: "6px 8px" } }, "Remove override") : null,
              ]),
            ])
          ),

          rows.length > 400 ? h("div", { style: { padding: "10px", color: "#666" } }, `Showing first 400 of ${rows.length} matches.`) : null,
        ]),

        editing
          ? h("div", { style: { marginTop: "16px", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", background: "#fafafa" } }, [
              h("h3", { style: { margin: "0 0 10px 0" } }, "Edit badge"),
              this.state.err ? h("div", { style: { color: "#b00020", marginBottom: "10px" } }, this.state.err) : null,

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Title"),
                h("input", {
                  type: "text",
                  value: editing.title || "",
                  onChange: (e) => {
                    const title = e.target.value;
                    const next = { ...editing, title };
                    if (!editing._id_touched && (editing.id || "").startswith?.(undefined)) {
                      // do nothing
                    }
                    if (!editing._id_touched && (editing.id || "").startsWith("new-badge")) {
                      const s = slugify(title);
                      if (s) next.id = s;
                    }
                    this.setState({ editing: next });
                  },
                  style: { padding: "8px" },
                }),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "ID"),
                h("input", {
                  type: "text",
                  value: editing.id || "",
                  onChange: (e) => this.setState({ editing: { ...editing, id: e.target.value, _id_touched: true } }),
                  style: { padding: "8px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
                }),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Status"),
                this.renderSelect(editing.status || "active", ["active", "retired"], (v) => this.setState({ editing: { ...editing, status: v } })),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Section"),
                this.renderSelect(editing.section || "", SECTION_OPTIONS, (v) => this.setState({ editing: { ...editing, section: v } })),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Category"),
                this.renderSelect(editing.category || "", CATEGORY_OPTIONS, (v) => this.setState({ editing: { ...editing, category: v } })),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Badge type"),
                this.renderSelect(editing.badge_type || "", BADGE_TYPE_OPTIONS, (v) => this.setState({ editing: { ...editing, badge_type: v } })),
              ]),

              h("div", { style: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px", alignItems: "center", marginBottom: "8px" } }, [
                h("div", null, "Icon path (optional)"),
                h("input", {
                  type: "text",
                  placeholder: "/assets/images/badges/<id>.png",
                  value: editing.icon || "",
                  onChange: (e) => this.setState({ editing: { ...editing, icon: e.target.value } }),
                  style: { padding: "8px" },
                }),
              ]),

              h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } }, [
                h("button", { type: "button", onClick: () => this.saveEdit(), style: { padding: "8px 10px" } }, "Save"),
                h("button", { type: "button", onClick: () => this.cancelEdit(), style: { padding: "8px 10px" } }, "Cancel"),
              ]),

              h("div", { style: { color: "#666", fontSize: "12px", marginTop: "10px" } },
                "Icon upload: use the Media Library (top-right) to upload PNGs into /assets/images/badges/, named <id>.png. The automation will create <id>_64.png.")
            ])
          : null,
      ]);
    },
  });

  const Preview = window.createClass({
    render() {
      return window.h("div", null, "");
    },
  });

  function register() {
    if (!ready()) return;
    try {
      window.CMS.registerWidget("badges_manager", Control, Preview);
      console.log("[badges_manager] registered");
    } catch (e) {
      console.error("[badges_manager] register failed", e);
    }
  }

  const t = setInterval(function () {
    if (!ready()) return;
    clearInterval(t);
    register();
  }, 50);
})();
