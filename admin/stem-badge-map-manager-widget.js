(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ----------------------------
  // Data loaders
  // ----------------------------
  let _badges = null;
  let _badgesLoading = null;

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function cleanReqText(t) {
    const s = String(t || "").trim();
    // Strip leading "1." / "1)" / "1 -" etc if present
    return s.replace(/^\s*\d+\s*[\.\)\-:]\s*/, "");
  }

  function titleCaseIfNeeded(s) {
    const str = String(s || "").trim();
    if (!str) return str;
    // If it already contains uppercase letters, keep as-is.
    if (/[A-Z]/.test(str)) return str;
    return str
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  async function loadBadges() {
    if (_badges) return _badges;
    if (_badgesLoading) return _badgesLoading;

    _badgesLoading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const arr = Array.isArray(json)
          ? json
          : Array.isArray(json.badges)
            ? json.badges
            : [];

        _badges = (arr || []).map((b) => {
          const title = b.badge_name || b.badge || b.title || b.id;
          const section = titleCaseIfNeeded(b.section_label || b.section || "");
          const section_slug = b.section_slug || slugify(section);
          const category = b.category || "";
          const badge_type = b.badge_type || b.type || "";

          const requirements = Array.isArray(b.requirements)
            ? b.requirements
                .filter(
                  (r) =>
                    r &&
                    r.kind === "req" &&
                    (r.id != null || r.no != null) &&
                    String(r.text || "").trim() !== ""
                )
                .map((r) => {
                  const no = String(r.no ?? r.id).trim();
                  return {
                    no,
                    text: cleanReqText(r.text),
                  };
                })
            : [];

          const display = `${section} — ${title}`.trim();

          return {
            id: b.id,
            title,
            section,
            section_slug,
            category,
            badge_type,
            requirements,
            _display: display.toLowerCase(),
          };
        });

        console.log("[stem_badge_map_manager] loaded badges:", _badges.length);
        return _badges;
      })
      .catch((e) => {
        console.error("[stem_badge_map_manager] load failed:", e);
        _badges = [];
        return _badges;
      });

    return _badgesLoading;
  }

  // ----------------------------
  // Value helpers (Immutable-safe)
  // ----------------------------
  function toPlain(v) {
    let out = v;
    if (out && typeof out.get === "function") {
      try {
        out = out.toJS();
      } catch (e) {
        out = {};
      }
    }
    return out;
  }

  function ensureMapRoot(value) {
    const v = toPlain(value);
    if (v && typeof v === "object") return v;
    return {};
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function indexExisting(badgesArr) {
    const idx = new Map();
    (badgesArr || []).forEach((b) => {
      if (b && b.badge_id) idx.set(String(b.badge_id), b);
    });
    return idx;
  }

  function findReqEntry(badgeEntry, reqNo) {
    const list = (badgeEntry && badgeEntry.stem_requirements) || [];
    const no = String(reqNo);
    return list.find((r) => String(r.ref || "") === no || String(r.rid || "").endsWith(`::${no}`)) || null;
  }

  function buildReqEntry(badgeId, reqNo, reqText) {
    const no = String(reqNo);
    const text = `${no}. ${cleanReqText(reqText)}`.trim();
    return {
      rid: `${badgeId}::${no}`,
      ref: no,
      text,
      strength: "strong",
      areas: [],
      why_stem: "",
      leader_prompts: [],
    };
  }

  function normaliseImportedJSON(json) {
    // Accept array or {badges:[...]}
    const arr = Array.isArray(json) ? json : Array.isArray(json.badges) ? json.badges : [];
    const out = [];
    (arr || []).forEach((b) => {
      if (!b) return;
      const badge_id = b.badge_id || b.id || b.badge || b.slug;
      if (!badge_id) return;

      const entry = {
        badge_id: String(badge_id),
        title: b.title || b.badge_title || b.badge_name || "",
        section: b.section || "",
        section_slug: b.section_slug || slugify(b.section || ""),
        category: b.category || "",
        badge_type: b.badge_type || "",
        stem_requirements: [],
      };

      const reqs = Array.isArray(b.stem_requirements)
        ? b.stem_requirements
        : Array.isArray(b.requirements)
          ? b.requirements
          : [];

      (reqs || []).forEach((r) => {
        if (!r) return;
        const ref = r.ref ?? r.no ?? r.id;
        if (ref == null) return;
        entry.stem_requirements.push({
          rid: r.rid || `${entry.badge_id}::${String(ref)}`,
          ref: String(ref),
          text: r.text || r.requirement || "",
          strength: r.strength || "strong",
          areas: Array.isArray(r.areas) ? r.areas : [],
          why_stem: r.why_stem || "",
          leader_prompts: Array.isArray(r.leader_prompts) ? r.leader_prompts : [],
        });
      });

      // Only keep if it has at least 1 requirement
      if (entry.stem_requirements.length > 0) out.push(entry);
    });
    return out;
  }

  // ----------------------------
  // Widget
  // ----------------------------
  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return {
          loading: true,
          badges: [],
          query: "",
          expanded: {}, // badge_id -> bool
          // value cache to avoid re-hydrating while typing
          valueHash: "",
          mapRoot: { badges: [] },
          message: "",
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
        const root = ensureMapRoot(value);
        const badgesArr = Array.isArray(root.badges) ? root.badges : [];
        const hash = JSON.stringify(badgesArr);

        if (hash === this.state.valueHash) return;

        this.setState({
          mapRoot: { badges: clone(badgesArr) },
          valueHash: hash,
        });
      },

      emit(nextRoot) {
        // Keep YAML shape: {badges:[...]}
        this.props.onChange(nextRoot);
      },

      setQuery(e) {
        this.setState({ query: (e.target && e.target.value) || "" });
      },

      toggleExpanded(badgeId) {
        const expanded = Object.assign({}, this.state.expanded);
        expanded[badgeId] = !expanded[badgeId];
        this.setState({ expanded });
      },

      mappedCountFor(badgeId) {
        const idx = indexExisting(this.state.mapRoot.badges);
        const entry = idx.get(badgeId);
        return entry && Array.isArray(entry.stem_requirements) ? entry.stem_requirements.length : 0;
      },

      addReq(badge, req) {
        const root = clone(this.state.mapRoot);
        root.badges = Array.isArray(root.badges) ? root.badges : [];

        const idx = indexExisting(root.badges);
        let entry = idx.get(badge.id);
        if (!entry) {
          entry = {
            badge_id: badge.id,
            title: badge.title,
            section: badge.section,
            section_slug: badge.section_slug,
            category: badge.category,
            badge_type: badge.badge_type,
            stem_requirements: [],
          };
          root.badges.push(entry);
        }

        entry.title = entry.title || badge.title;
        entry.section = entry.section || badge.section;
        entry.section_slug = entry.section_slug || badge.section_slug;
        entry.category = entry.category || badge.category;
        entry.badge_type = entry.badge_type || badge.badge_type;

        entry.stem_requirements = Array.isArray(entry.stem_requirements)
          ? entry.stem_requirements
          : [];

        const existing = findReqEntry(entry, req.no);
        if (existing) return;

        entry.stem_requirements.push(buildReqEntry(badge.id, req.no, req.text));

        // Keep ordering stable by ref number
        entry.stem_requirements.sort((a, b) => {
          const na = parseFloat(String(a.ref || "0").replace(/[^0-9.]/g, "")) || 0;
          const nb = parseFloat(String(b.ref || "0").replace(/[^0-9.]/g, "")) || 0;
          return na - nb;
        });

        this.emit(root);
      },

      removeReq(badgeId, reqNo) {
        const root = clone(this.state.mapRoot);
        root.badges = Array.isArray(root.badges) ? root.badges : [];

        const i = root.badges.findIndex((b) => b && String(b.badge_id) === String(badgeId));
        if (i < 0) return;

        const entry = root.badges[i];
        const no = String(reqNo);
        entry.stem_requirements = (entry.stem_requirements || []).filter(
          (r) => String(r.ref || "") !== no && !String(r.rid || "").endsWith(`::${no}`)
        );

        // If no mapped reqs left, remove the badge entry entirely
        if (!entry.stem_requirements || entry.stem_requirements.length === 0) {
          root.badges.splice(i, 1);
        }

        this.emit(root);
      },

      async importLegacy() {
        const ok = window.confirm(
          "Import existing mapping from assets/data/stem_badge_map.json into this editor?\n\nThis will REPLACE the current badges list in _data/stem_badge_map.yml." 
        );
        if (!ok) return;

        try {
          // In CMS, we're under /admin/ so go up one level
          const r = await fetch("../assets/data/stem_badge_map.json", { cache: "no-store" });
          if (!r.ok) throw new Error(`legacy JSON fetch failed: ${r.status}`);
          const json = await r.json();
          const importedBadges = normaliseImportedJSON(json);
          const root = { badges: importedBadges };
          this.setState({ message: `Imported ${importedBadges.length} badges from legacy JSON. Click Save.` });
          this.emit(root);
        } catch (e) {
          console.error("[stem_badge_map_manager] import failed:", e);
          this.setState({ message: `Import failed: ${String(e.message || e)}` });
        }
      },

      render() {
        const styles = {
          header: { fontWeight: 700, fontSize: 18, marginBottom: 6 },
          sub: { color: "#555", fontSize: 13, marginBottom: 12, lineHeight: 1.35 },
          toolbar: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
          search: {
            flex: "1 1 260px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cfcfcf",
            fontSize: 14,
          },
          btn: {
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cfcfcf",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          },
          msg: { marginTop: 8, color: "#1f6feb", fontSize: 13 },
          card: (mapped) => ({
            border: "1px solid #e3e3e3",
            borderRadius: 10,
            padding: 12,
            background: mapped ? "#ecf7ee" : "#fff",
            marginBottom: 10,
          }),
          row: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
          title: { fontWeight: 700, fontSize: 15 },
          meta: { color: "#666", fontSize: 12, marginTop: 2 },
          pill: (mapped) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #d0d7de",
            background: mapped ? "#d1f5d8" : "#f6f8fa",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }),
          toggle: {
            border: "1px solid #d0d7de",
            background: "#fff",
            borderRadius: 999,
            width: 34,
            height: 28,
            cursor: "pointer",
          },
          reqRow: {
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 0",
            borderTop: "1px solid #efefef",
          },
          reqLeft: { flex: "1 1 auto" },
          reqRef: { fontWeight: 700, fontSize: 13 },
          reqText: { color: "#444", fontSize: 13, marginTop: 2 },
          reqBtn: (primary) => ({
            minWidth: 72,
            padding: "8px 10px",
            borderRadius: 8,
            border: primary ? "1px solid #1f883d" : "1px solid #d0d7de",
            background: primary ? "#1f883d" : "#fff",
            color: primary ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }),
        };

        const idx = indexExisting(this.state.mapRoot.badges);
        const q = String(this.state.query || "").trim().toLowerCase();

        const filtered = (this.state.badges || []).filter((b) => {
          if (!q) return true;

          // Badge title / id match
          const titleHit = (b._display || "").includes(q) || String(b.id || "").includes(q);
          if (titleHit) return true;

          // Requirement text match
          return (b.requirements || []).some((r) => `${r.no}. ${r.text}`.toLowerCase().includes(q));
        });

        return h(
          "div",
          { style: { padding: 2 } },
          h("div", { style: styles.header }, "STEM Badge Map Manager"),
          h(
            "div",
            { style: styles.sub },
            "Search a badge, expand it, then Add/Remove individual requirements. Existing mapped content is loaded from _data/stem_badge_map.yml (badges → stem_requirements)."
          ),
          h(
            "div",
            { style: styles.toolbar },
            h("input", {
              type: "search",
              placeholder: "Search badge name or requirement text…",
              value: this.state.query,
              onInput: this.setQuery,
              style: styles.search,
            }),
            h(
              "button",
              { type: "button", onClick: this.importLegacy, style: styles.btn },
              "Import existing mapping"
            )
          ),
          this.state.message ? h("div", { style: styles.msg }, this.state.message) : null,
          this.state.loading
            ? h("div", null, "Loading badges…")
            : filtered.map((b) => {
                const entry = idx.get(b.id);
                const mappedCount = entry && entry.stem_requirements ? entry.stem_requirements.length : 0;
                const isExpanded = !!this.state.expanded[b.id];
                const badgeTitle = `${b.section} — ${b.title}`.trim();
                const meta = `${b.section_slug} · ${b.category || ""}`.trim();

                return h(
                  "div",
                  { key: b.id, style: styles.card(mappedCount > 0) },
                  h(
                    "div",
                    { style: styles.row },
                    h(
                      "div",
                      null,
                      h("div", { style: styles.title }, badgeTitle),
                      h("div", { style: styles.meta }, meta)
                    ),
                    h(
                      "div",
                      { style: { display: "flex", gap: 8, alignItems: "center" } },
                      h(
                        "span",
                        { style: styles.pill(mappedCount > 0) },
                        mappedCount > 0 ? `✅ ${mappedCount} mapped` : "—"
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          style: styles.toggle,
                          onClick: () => this.toggleExpanded(b.id),
                          title: isExpanded ? "Collapse" : "Expand",
                        },
                        isExpanded ? "–" : "+"
                      )
                    )
                  ),

                  isExpanded
                    ? h(
                        "div",
                        null,
                        (b.requirements || []).map((r) => {
                          const mapped = entry ? !!findReqEntry(entry, r.no) : false;
                          return h(
                            "div",
                            { key: `${b.id}::${r.no}`, style: styles.reqRow },
                            h(
                              "div",
                              { style: styles.reqLeft },
                              h("div", { style: styles.reqRef }, `Req ${r.no}`),
                              h("div", { style: styles.reqText }, `${r.no}. ${r.text}`)
                            ),
                            mapped
                              ? h(
                                  "button",
                                  {
                                    type: "button",
                                    style: styles.reqBtn(false),
                                    onClick: () => this.removeReq(b.id, r.no),
                                  },
                                  "Remove"
                                )
                              : h(
                                  "button",
                                  {
                                    type: "button",
                                    style: styles.reqBtn(true),
                                    onClick: () => this.addReq(b, r),
                                  },
                                  "Add"
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
        return h("div", null, "STEM Badge Map Manager");
      },
    });

    CMS.registerWidget("stem_badge_map_manager", Control, Preview);
    console.log("[stem_badge_map_manager] widget registered");
    return true;
  }

  // Register now / later
  if (!register()) {
    const t = setInterval(() => {
      if (register()) clearInterval(t);
    }, 50);
  }
})();
