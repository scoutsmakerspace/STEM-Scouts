(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ---------------------------
  // Data loaders
  // ---------------------------
  let _badges = null;
  let _badgesLoading = null;

  async function loadBadges() {
    if (_badges) return _badges;
    if (_badgesLoading) return _badgesLoading;

    const url = (window.location.origin || "") + "/assets/data/badges_master.json";
    _badgesLoading = fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        _badges = Array.isArray(json) ? json : (json && Array.isArray(json.badges) ? json.badges : []);
        return _badges;
      })
      .catch((e) => {
        console.warn("[stem_badge_map_manager] failed to load badges master:", e);
        _badges = [];
        return _badges;
      });

    return _badgesLoading;
  }

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function clone(x) {
    return JSON.parse(JSON.stringify(x || null));
  }

  function ensureArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function makeRid(badgeId, ref) {
    return `${badgeId}::${ref}`;
  }

  // ---------------------------
  // Control component
  // ---------------------------
  const Control = window.createClass({
    getInitialState() {
      return {
        q: "",
        open: {},
        badgesMaster: null,
      };
    },

    componentDidMount() {
      loadBadges().then((bm) => this.setState({ badgesMaster: bm }));
    },

    toggleOpen(badgeId) {
      const open = { ...(this.state.open || {}) };
      open[badgeId] = !open[badgeId];
      this.setState({ open });
    },

    setQuery(e) {
      this.setState({ q: e.target.value || "" });
    },

    // Value is the YAML field "badges": [ ... ]
    getValue() {
      return ensureArray(this.props.value);
    },

    setValue(next) {
      this.props.onChange(next);
    },

    addBadge(badgeId) {
      const val = this.getValue();
      if (val.some((b) => b.badge_id === badgeId)) return;

      const meta = (this.state.badgesMaster || []).find((b) => b.id === badgeId) || {};
      const next = val.concat([
        {
          badge_id: badgeId,
          title: meta.badge_name || meta.title || badgeId,
          section: meta.section || "",
          section_slug: norm(meta.section || "").replace(/\s+/g, "-"),
          category: meta.category || "",
          badge_type: meta.badge_type || "",
          stem_requirements: [],
        },
      ]);
      this.setValue(next);
      this.toggleOpen(badgeId);
    },

    removeBadge(badgeId) {
      const next = this.getValue().filter((b) => b.badge_id !== badgeId);
      this.setValue(next);
    },

    addRequirement(badgeId) {
      const ref = prompt("Requirement ref/number (e.g. 1 or 3a):");
      if (!ref) return;
      const text = prompt("Requirement text (as shown on the official badge page):");
      if (!text) return;

      const val = clone(this.getValue());
      const b = val.find((x) => x.badge_id === badgeId);
      if (!b) return;
      b.stem_requirements = ensureArray(b.stem_requirements);

      const rid = makeRid(badgeId, String(ref).trim());
      if (b.stem_requirements.some((r) => r.rid === rid)) return;

      b.stem_requirements.push({
        rid,
        ref: String(ref).trim(),
        text: String(text).trim(),
        strength: "strong",
        areas: [],
        why_stem: "",
        leader_prompts: "",
      });

      this.setValue(val);
      this.forceUpdate();
    },

    removeRequirement(badgeId, rid) {
      const val = clone(this.getValue());
      const b = val.find((x) => x.badge_id === badgeId);
      if (!b) return;
      b.stem_requirements = ensureArray(b.stem_requirements).filter((r) => r.rid !== rid);
      this.setValue(val);
      this.forceUpdate();
    },

    updateReqField(badgeId, rid, field, nextVal) {
      const val = clone(this.getValue());
      const b = val.find((x) => x.badge_id === badgeId);
      if (!b) return;
      const r = ensureArray(b.stem_requirements).find((x) => x.rid === rid);
      if (!r) return;
      r[field] = nextVal;
      this.setValue(val);
    },

    updateAreas(badgeId, rid, csv) {
      const parts = String(csv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      this.updateReqField(badgeId, rid, "areas", parts);
    },

    renderBadgeRow(meta, isMapped, mappedBadge) {
      const badgeId = meta.id || meta.badge_id || "";
      const title = meta.badge_name || meta.title || badgeId;
      const section = meta.section || (mappedBadge && mappedBadge.section) || "";
      const category = meta.category || (mappedBadge && mappedBadge.category) || "";

      const open = !!(this.state.open || {})[badgeId];

      const iconUrl = `/assets/images/badges/${encodeURIComponent(badgeId)}.png`;

      return window.h(
        "div",
        { key: badgeId, className: "sbmm-card" },
        window.h(
          "div",
          { className: "sbmm-card__top" },
          window.h(
            "div",
            { className: "sbmm-card__left" },
            window.h("img", {
              className: "sbmm-icon",
              src: iconUrl,
              onError: (e) => (e.target.src = "/assets/images/badges/missing.png"),
            }),
            window.h(
              "div",
              null,
              window.h("div", { className: "sbmm-title" }, title),
              window.h("div", { className: "sbmm-meta" }, `${section} · ${category}`)
            )
          ),
          window.h(
            "div",
            { className: "sbmm-card__actions" },
            isMapped
              ? window.h(
                  "button",
                  { type: "button", className: "sbmm-btn", onClick: () => this.toggleOpen(badgeId) },
                  open ? "−" : "+"
                )
              : window.h(
                  "button",
                  { type: "button", className: "sbmm-btn sbmm-btn--add", onClick: () => this.addBadge(badgeId) },
                  "+"
                ),
            isMapped
              ? window.h(
                  "button",
                  { type: "button", className: "sbmm-btn sbmm-btn--remove", onClick: () => this.removeBadge(badgeId) },
                  "×"
                )
              : null
          )
        ),
        isMapped && open ? this.renderBadgeDetails(mappedBadge) : null
      );
    },

    renderBadgeDetails(badge) {
      const badgeId = badge.badge_id;
      const reqs = ensureArray(badge.stem_requirements);

      return window.h(
        "div",
        { className: "sbmm-details" },
        window.h(
          "div",
          { className: "sbmm-details__actions" },
          window.h(
            "button",
            { type: "button", className: "sbmm-btn sbmm-btn--small", onClick: () => this.addRequirement(badgeId) },
            "Add requirement"
          )
        ),
        reqs.length
          ? reqs.map((r) =>
              window.h(
                "div",
                { key: r.rid, className: "sbmm-req" },
                window.h(
                  "div",
                  { className: "sbmm-req__head" },
                  window.h("strong", null, r.ref || ""),
                  window.h("span", null, " "),
                  window.h("span", null, r.text || ""),
                  window.h(
                    "button",
                    { type: "button", className: "sbmm-x", onClick: () => this.removeRequirement(badgeId, r.rid) },
                    "Remove"
                  )
                ),
                window.h(
                  "div",
                  { className: "sbmm-grid" },
                  window.h("label", null, "Strength"),
                  window.h("select", {
                    value: r.strength || "strong",
                    onChange: (e) => this.updateReqField(badgeId, r.rid, "strength", e.target.value),
                  }, [
                    window.h("option", { value: "strong" }, "strong"),
                    window.h("option", { value: "medium" }, "medium"),
                    window.h("option", { value: "borderline" }, "borderline"),
                  ]),
                  window.h("label", null, "Areas (comma-separated)"),
                  window.h("input", {
                    type: "text",
                    value: ensureArray(r.areas).join(", "),
                    onChange: (e) => this.updateAreas(badgeId, r.rid, e.target.value),
                  }),
                  window.h("label", null, "Why STEM"),
                  window.h("textarea", {
                    value: r.why_stem || "",
                    rows: 3,
                    onChange: (e) => this.updateReqField(badgeId, r.rid, "why_stem", e.target.value),
                  }),
                  window.h("label", null, "Leader prompts"),
                  window.h("textarea", {
                    value: r.leader_prompts || "",
                    rows: 3,
                    onChange: (e) => this.updateReqField(badgeId, r.rid, "leader_prompts", e.target.value),
                  })
                )
              )
            )
          : window.h("div", { className: "sbmm-empty" }, "No mapped requirements yet.")
      );
    },

    render() {
      const val = this.getValue();
      const mappedIds = new Set(val.map((b) => b.badge_id));

      const master = ensureArray(this.state.badgesMaster).map((b) => ({
        id: b.id,
        badge_name: b.badge_name,
        section: b.section,
        category: b.category,
        badge_type: b.badge_type,
      }));

      // Show master list but prefer mapped badge metadata when available
      const q = norm(this.state.q);
      const rows = master
        .filter((b) => {
          if (!q) return true;
          const hay = `${b.badge_name} ${b.section} ${b.category} ${b.id}`.toLowerCase();
          return hay.includes(q);
        })
        .sort((a, b) => (a.section || "").localeCompare(b.section || "") || (a.badge_name || "").localeCompare(b.badge_name || ""));

      const mappedById = {};
      val.forEach((b) => (mappedById[b.badge_id] = b));

      return window.h(
        "div",
        { className: "sbmm" },
        window.h("div", { className: "sbmm-head" },
          window.h("h2", null, "STEM Badge Map Manager"),
          window.h("p", null, "Expand a badge, then add/remove requirements and edit Strength / Areas / Why STEM / Leader prompts.")
        ),
        window.h("div", { className: "sbmm-toolbar" },
          window.h("input", {
            type: "search",
            placeholder: "Search badge name…",
            value: this.state.q,
            onChange: this.setQuery,
            className: "sbmm-search",
          })
        ),
        window.h(
          "div",
          null,
          rows.map((m) => this.renderBadgeRow(m, mappedIds.has(m.id), mappedById[m.id]))
        )
      );
    },
  });

  const Preview = window.createClass({
    render() {
      return window.h("div", { style: { fontStyle: "italic" } }, "This field is managed by the STEM Badge Map Manager widget.");
    },
  });

  function register() {
    window.CMS.registerWidget("stem_badge_map_manager", Control, Preview);
    console.log("[stem_badge_map_manager] widget registered");
  }

  function tick() {
    if (ready()) return register();
    setTimeout(tick, 50);
  }

  // Inject minimal styles for the widget
  (function injectCss() {
    const css = `
      .sbmm { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .sbmm-head h2 { margin: 0 0 .25rem; }
      .sbmm-head p { margin: 0 0 1rem; color:#6b7280; }
      .sbmm-toolbar { display:flex; gap:.75rem; margin: .5rem 0 1rem; }
      .sbmm-search { width: 100%; max-width: 560px; padding: .6rem .8rem; border:1px solid #e5e7eb; border-radius:10px; }
      .sbmm-card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; margin:.75rem 0; overflow:hidden; }
      .sbmm-card__top { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.75rem; }
      .sbmm-card__left { display:flex; align-items:center; gap:.6rem; min-width:0; }
      .sbmm-icon { width:28px; height:28px; object-fit:contain; border-radius:6px; }
      .sbmm-title { font-weight:700; }
      .sbmm-meta { color:#6b7280; font-size:.9rem; }
      .sbmm-card__actions { display:flex; gap:.5rem; align-items:center; }
      .sbmm-btn { border:1px solid #e5e7eb; background:#f9fafb; border-radius:10px; padding:.35rem .6rem; cursor:pointer; }
      .sbmm-btn--add { font-weight:800; }
      .sbmm-btn--remove { background:#fff; }
      .sbmm-btn--small { padding:.25rem .5rem; }
      .sbmm-details { border-top:1px solid #e5e7eb; padding:.75rem; background:#fafafa; }
      .sbmm-details__actions { margin-bottom:.5rem; }
      .sbmm-req { border:1px solid #e5e7eb; background:#fff; border-radius:12px; padding:.75rem; margin:.6rem 0; }
      .sbmm-req__head { display:flex; justify-content:space-between; gap:.5rem; margin-bottom:.5rem; }
      .sbmm-x { border:none; background:transparent; cursor:pointer; color:#ef4444; font-weight:700; }
      .sbmm-grid { display:grid; grid-template-columns: 160px 1fr; gap:.4rem .75rem; align-items:center; }
      .sbmm-grid input, .sbmm-grid textarea, .sbmm-grid select { width:100%; padding:.45rem .6rem; border:1px solid #e5e7eb; border-radius:10px; }
      .sbmm-empty { color:#6b7280; }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  })();

  tick();
})();