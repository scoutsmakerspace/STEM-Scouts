(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ----------------------------
  // Configurable options (edit to taste)
  // ----------------------------
  const AREA_OPTIONS = [
    "Coding",
    "Electronics",
    "Engineering",
    "Design",
    "Science",
    "Maths",
    "Digital making",
    "Craft & build",
    "Sustainability",
  ];

  const STRENGTH_OPTIONS = [
    { value: "strong", label: "Strong" },
    { value: "medium", label: "Medium" },
    { value: "light", label: "Light" },
  ];

  // ----------------------------
  // Data loaders
  // ----------------------------
  let _badges = null;
  let _badgesLoading = null;

  // Activities index (badge_id -> [{ title, url } ...])
  let _activitiesByBadge = null;
  let _activitiesLoading = null;

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
    return s.replace(/^\s*\d+\s*[\.\)\-:]\s*/, "");
  }

  function titleCaseIfNeeded(s) {
    const str = String(s || "").trim();
    if (!str) return str;
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
                  return { no, text: cleanReqText(r.text) };
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

  async function loadActivitiesByBadge() {
    if (_activitiesByBadge) return _activitiesByBadge;
    if (_activitiesLoading) return _activitiesLoading;

    // In CMS we are under /admin/, so assets live one level up.
    const urls = [
      "../assets/data/activities_index.json",
      "../assets/data/activities_index.json?cachebust=" + Date.now(),
    ];

    _activitiesLoading = (async () => {
      let json = null;
      let lastErr = null;

      for (const u of urls) {
        try {
          const r = await fetch(u, { cache: "no-store" });
          if (!r.ok) throw new Error(`activities_index fetch failed: ${r.status}`);
          json = await r.json();
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!Array.isArray(json)) {
        console.warn(
          "[stem_badge_map_manager] activities index not available (this is optional)",
          lastErr || ""
        );
        _activitiesByBadge = {};
        return _activitiesByBadge;
      }

      const byBadge = {};
      json.forEach((a) => {
        const title = a && a.title ? String(a.title) : "";
        const url = a && a.url ? String(a.url) : "";
        const badgeIds = Array.isArray(a && a.badge_ids) ? a.badge_ids : [];
        badgeIds.forEach((bid) => {
          const id = String(bid || "").trim();
          if (!id) return;
          if (!byBadge[id]) byBadge[id] = [];
          byBadge[id].push({ title, url });
        });
      });

      // Sort activity lists by title for stable UX
      Object.keys(byBadge).forEach((bid) => {
        byBadge[bid].sort((x, y) => String(x.title).localeCompare(String(y.title)));
      });

      _activitiesByBadge = byBadge;
      console.log(
        "[stem_badge_map_manager] loaded activities index for badges:",
        Object.keys(_activitiesByBadge).length
      );
      return _activitiesByBadge;
    })();

    return _activitiesLoading;
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
        out = null;
      }
    }
    return out;
  }

  // FIELD VALUE MUST BE AN ARRAY (because config.yml field name is "badges")
  function normaliseValueToArray(value) {
    const v = toPlain(value);

    if (Array.isArray(v)) return v;

    // Recover from broken nesting (badges: { badges: [...] })
    if (v && typeof v === "object" && Array.isArray(v.badges)) return v.badges;

    return [];
  }

  function cloneArr(arr) {
    return JSON.parse(JSON.stringify(arr || []));
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
    return (
      list.find(
        (r) => String(r.ref || "") === no || String(r.rid || "").endsWith(`::${no}`)
      ) || null
    );
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
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json.badges)
      ? json.badges
      : [];

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
          loadingActivities: true,
          badges: [],
          activitiesByBadge: {},
          query: "",
          expanded: {}, // badge_id -> bool
          reqExpanded: {}, // "badge_id::reqNo" -> bool
          valueHash: "",
          mappedBadges: [], // ARRAY of mapped badge entries
          message: "",
          lastNonEmptyHash: "",
        };
      },

      async componentDidMount() {
        const badges = await loadBadges();
        const activitiesByBadge = await loadActivitiesByBadge();
        this.setState({ badges, activitiesByBadge: activitiesByBadge || {}, loading: false, loadingActivities: false });
        this.hydrateFromValue(this.props.value);
      },

      componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value) {
          this.hydrateFromValue(this.props.value);
        }
      },

      hydrateFromValue(value) {
        const arr = normaliseValueToArray(value);
        const hash = JSON.stringify(arr);

        if (hash === this.state.valueHash) return;

        const lastNonEmptyHash = arr && arr.length > 0 ? hash : this.state.lastNonEmptyHash || "";

        this.setState({
          mappedBadges: cloneArr(arr),
          valueHash: hash,
          lastNonEmptyHash,
        });
      },

      emit(nextArr) {
        // Safety: don’t wipe a non-empty map without confirmation
        if (
          Array.isArray(nextArr) &&
          nextArr.length === 0 &&
          this.state.lastNonEmptyHash &&
          this.state.lastNonEmptyHash !== JSON.stringify([])
        ) {
          const ok = window.confirm(
            "This change would clear ALL mapped badges/requirements.\n\nAre you sure you want to save an empty mapping?"
          );
          if (!ok) return;
        }

        this.props.onChange(nextArr);
      },

      setQuery(e) {
        this.setState({ query: (e.target && e.target.value) || "" });
      },

      toggleExpanded(badgeId) {
        const expanded = Object.assign({}, this.state.expanded);
        expanded[badgeId] = !expanded[badgeId];
        this.setState({ expanded });
      },

      toggleReqDetails(key) {
        const reqExpanded = Object.assign({}, this.state.reqExpanded);
        reqExpanded[key] = !reqExpanded[key];
        this.setState({ reqExpanded });
      },

      addReq(badge, req) {
        const arr = cloneArr(this.state.mappedBadges);
        const idx = indexExisting(arr);

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
          arr.push(entry);
        }

        entry.stem_requirements = Array.isArray(entry.stem_requirements) ? entry.stem_requirements : [];

        if (findReqEntry(entry, req.no)) return;

        entry.stem_requirements.push(buildReqEntry(badge.id, req.no, req.text));

        entry.stem_requirements.sort((a, b) => {
          const na = parseFloat(String(a.ref || "0").replace(/[^0-9.]/g, "")) || 0;
          const nb = parseFloat(String(b.ref || "0").replace(/[^0-9.]/g, "")) || 0;
          return na - nb;
        });

        this.emit(arr);
      },

      removeReq(badgeId, reqNo) {
        const arr = cloneArr(this.state.mappedBadges);

        const i = arr.findIndex((b) => b && String(b.badge_id) === String(badgeId));
        if (i < 0) return;

        const entry = arr[i];
        const no = String(reqNo);

        entry.stem_requirements = (entry.stem_requirements || []).filter(
          (r) => String(r.ref || "") !== no && !String(r.rid || "").endsWith(`::${no}`)
        );

        if (!entry.stem_requirements || entry.stem_requirements.length === 0) {
          arr.splice(i, 1);
        }

        this.emit(arr);
      },

      // ---- update fields for a mapped requirement ----
      updateReqField(badgeId, reqNo, field, value) {
        const arr = cloneArr(this.state.mappedBadges);
        const i = arr.findIndex((b) => b && String(b.badge_id) === String(badgeId));
        if (i < 0) return;

        const entry = arr[i];
        const req = (entry.stem_requirements || []).find(
          (r) =>
            String(r.ref || "") === String(reqNo) ||
            String(r.rid || "").endsWith(`::${String(reqNo)}`)
        );
        if (!req) return;

        req[field] = value;

        if (field === "areas" && !Array.isArray(req.areas)) req.areas = [];
        if (field === "leader_prompts" && !Array.isArray(req.leader_prompts)) req.leader_prompts = [];

        this.emit(arr);
      },

      toggleArea(badgeId, reqNo, area) {
        const arr = cloneArr(this.state.mappedBadges);
        const i = arr.findIndex((b) => b && String(b.badge_id) === String(badgeId));
        if (i < 0) return;

        const entry = arr[i];
        const req = (entry.stem_requirements || []).find(
          (r) =>
            String(r.ref || "") === String(reqNo) ||
            String(r.rid || "").endsWith(`::${String(reqNo)}`)
        );
        if (!req) return;

        req.areas = Array.isArray(req.areas) ? req.areas : [];
        const set = new Set(req.areas.map(String));
        if (set.has(String(area))) set.delete(String(area));
        else set.add(String(area));
        req.areas = Array.from(set);

        this.emit(arr);
      },

      async importLegacy() {
        const ok = window.confirm(
          "Import existing mapping from assets/data/stem_badge_map.json?\n\nThis will REPLACE the current mapping."
        );
        if (!ok) return;

        try {
          const r = await fetch("../assets/data/stem_badge_map.json", { cache: "no-store" });
          if (!r.ok) throw new Error(`legacy JSON fetch failed: ${r.status}`);
          const json = await r.json();
          const imported = normaliseImportedJSON(json);

          this.setState({ message: `Imported ${imported.length} badges. Click Save.` });
          this.emit(imported);
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
          search: { flex: "1 1 260px", padding: "10px 12px", borderRadius: 8, border: "1px solid #cfcfcf", fontSize: 14 },
          btn: { padding: "10px 12px", borderRadius: 8, border: "1px solid #cfcfcf", background: "#fff", cursor: "pointer", fontWeight: 600 },
          msg: { marginTop: 8, color: "#1f6feb", fontSize: 13 },
          card: (mapped) => ({ border: "1px solid #e3e3e3", borderRadius: 10, padding: 12, background: mapped ? "#ecf7ee" : "#fff", marginBottom: 10 }),
          row: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
          title: { fontWeight: 700, fontSize: 15 },
          meta: { color: "#666", fontSize: 12, marginTop: 2 },
          pill: (mapped) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, border: "1px solid #d0d7de", background: mapped ? "#d1f5d8" : "#f6f8fa", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }),
          pillInfo: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, border: "1px solid #d0d7de", background: "#e7f0ff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
          toggle: { border: "1px solid #d0d7de", background: "#fff", borderRadius: 999, width: 34, height: 28, cursor: "pointer" },
          reqRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid #efefef" },
          reqLeft: { flex: "1 1 auto" },
          reqRef: { fontWeight: 700, fontSize: 13 },
          reqText: { color: "#444", fontSize: 13, marginTop: 2 },
          reqBtn: (primary) => ({ minWidth: 72, padding: "8px 10px", borderRadius: 8, border: primary ? "1px solid #1f883d" : "1px solid #d0d7de", background: primary ? "#1f883d" : "#fff", color: primary ? "#fff" : "#111", cursor: "pointer", fontWeight: 700 }),
          smallBtn: { padding: "6px 10px", borderRadius: 999, border: "1px solid #d0d7de", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 },
          detailsBox: { marginTop: 10, padding: 10, borderRadius: 10, border: "1px dashed #c9c9c9", background: "#fff" },
          label: { display: "block", fontSize: 12, fontWeight: 700, color: "#444", marginTop: 10, marginBottom: 4 },
          select: { width: "220px", padding: "8px 10px", borderRadius: 8, border: "1px solid #cfcfcf" },

          // ✅ UPDATED: make textareas clearly multi-line, and preserve line breaks nicely
          textarea: {
            width: "100%",
            minHeight: 120,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cfcfcf",
            resize: "vertical",
            lineHeight: 1.35,
            whiteSpace: "pre-wrap",
          },

          areasWrap: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 },
          areaChip: (on) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d0d7de",
            background: on ? "#dbeafe" : "#f6f8fa",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            userSelect: "none",
          }),

          usedByWrap: { marginTop: 8, paddingTop: 8, borderTop: "1px solid #efefef" },
          usedByInline: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e5e5" },
          usedByLabel: { color: "#444", fontSize: 12, fontWeight: 700, marginBottom: 6 },
          usedByLinks: { display: "flex", flexWrap: "wrap", gap: 8 },
          usedByLink: {
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d0d7de",
            background: "#f6f8fa",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            color: "#0969da",
          },
        };

        const idx = indexExisting(this.state.mappedBadges);
        const q = String(this.state.query || "").trim().toLowerCase();

        const filtered = (this.state.badges || []).filter((b) => {
          if (!q) return true;
          const titleHit = (b._display || "").includes(q) || String(b.id || "").includes(q);
          if (titleHit) return true;
          return (b.requirements || []).some((r) => `${r.no}. ${r.text}`.toLowerCase().includes(q));
        });

        return h(
          "div",
          { style: { padding: 2 } },
          h("div", { style: styles.header }, "STEM Badge Map Manager"),
          h(
            "div",
            { style: styles.sub },
            "Expand a badge, then Add/Remove individual requirements. For mapped requirements, open Details to add Strength / Areas / Why STEM / Leader prompts."
          ),
          h(
            "div",
            { style: styles.toolbar },
            h("input", { type: "search", placeholder: "Search badge name or requirement text…", value: this.state.query, onInput: this.setQuery, style: styles.search }),
            h("button", { type: "button", onClick: this.importLegacy, style: styles.btn }, "Import existing mapping")
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
                const usedBy =
                  (this.state.activitiesByBadge && this.state.activitiesByBadge[b.id]) || [];

                return h(
                  "div",
                  { key: b.id, style: styles.card(mappedCount > 0) },
                  h(
                    "div",
                    { style: styles.row },
                    h("div", null, h("div", { style: styles.title }, h("img", { src: `/assets/images/badges/${b.id}.png`, alt: "", width: 24, height: 24, style: { marginRight: 8, borderRadius: 6, verticalAlign: "middle" }, onError: (e) => { try { e.target.onerror = null; e.target.src = "/assets/images/badges/_missing.png"; } catch (_) {} } }), badgeTitle), h("div", { style: styles.meta }, meta)),
                    h(
                      "div",
                      { style: { display: "flex", gap: 8, alignItems: "center" } },
                      h("span", { style: styles.pill(mappedCount > 0) }, mappedCount > 0 ? `✅ ${mappedCount} mapped` : "—"),
                      usedBy.length > 0 ? h("span", { style: styles.pillInfo }, `📎 ${usedBy.length} activit${usedBy.length === 1 ? "y" : "ies"}`) : null,
                      h("button", { type: "button", style: styles.toggle, onClick: () => this.toggleExpanded(b.id), title: isExpanded ? "Collapse" : "Expand" }, isExpanded ? "–" : "+")
                    )
                  ),

                  isExpanded
                    ? h(
                        "div",
                        null,
                        usedBy.length > 0
                          ? h(
                              "div",
                              { style: styles.usedByInline },
                              h(
                                "div",
                                { style: styles.usedByLabel },
                                `Used by ${usedBy.length} activit${usedBy.length === 1 ? "y" : "ies"}`
                              ),
                              h(
                                "div",
                                { style: styles.usedByLinks },
                                usedBy.map((a) =>
                                  h(
                                    "a",
                                    { key: a.url + a.title, href: a.url, target: "_blank", rel: "noopener noreferrer", style: styles.usedByLink },
                                    a.title || a.url
                                  )
                                )
                              )
                            )
                          : null,
                        (b.requirements || []).map((r) => {
                          const mappedReq = entry ? findReqEntry(entry, r.no) : null;
                          const mapped = !!mappedReq;
                          const key = `${b.id}::${r.no}`;
                          const showDetails = !!this.state.reqExpanded[key];

                          return h(
                            "div",
                            { key, style: styles.reqRow },
                            h(
                              "div",
                              { style: styles.reqLeft },
                              h(
                                "div",
                                { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" } },
                                h(
                                  "div",
                                  null,
                                  h("div", { style: styles.reqRef }, `Req ${r.no}`),
                                  h("div", { style: styles.reqText }, `${r.no}. ${r.text}`)
                                ),
                                mapped
                                  ? h(
                                      "button",
                                      { type: "button", style: styles.smallBtn, onClick: () => this.toggleReqDetails(key) },
                                      showDetails ? "Hide details" : "Details"
                                    )
                                  : null
                              ),

                              mapped && showDetails
                                ? h(
                                    "div",
                                    { style: styles.detailsBox },

                                    // Strength
                                    h("label", { style: styles.label }, "Strength"),
                                    h(
                                      "select",
                                      {
                                        style: styles.select,
                                        value: mappedReq.strength || "strong",
                                        onChange: (e) => this.updateReqField(b.id, r.no, "strength", e.target.value),
                                      },
                                      STRENGTH_OPTIONS.map((opt) => h("option", { key: opt.value, value: opt.value }, opt.label))
                                    ),

                                    // Areas
                                    h("label", { style: styles.label }, "Areas"),
                                    h(
                                      "div",
                                      { style: styles.areasWrap },
                                      AREA_OPTIONS.map((area) => {
                                        const on = Array.isArray(mappedReq.areas) && mappedReq.areas.map(String).includes(String(area));
                                        return h(
                                          "span",
                                          { key: area, style: styles.areaChip(on), onClick: () => this.toggleArea(b.id, r.no, area), role: "button", title: "Toggle" },
                                          on ? "✓" : "+",
                                          " ",
                                          area
                                        );
                                      })
                                    ),

                                    // Why STEM
                                    h("label", { style: styles.label }, "Why STEM (short explanation)"),
                                    h("textarea", {
                                      style: styles.textarea,
                                      value: mappedReq.why_stem || "",
                                      onKeyDown: (e) => {
                                        // Prevent parent handlers from intercepting Enter
                                        if (e.key === "Enter") e.stopPropagation();
                                      },
                                      onInput: (e) => this.updateReqField(b.id, r.no, "why_stem", e.target.value),
                                      placeholder: "e.g. Links to problem-solving, design thinking, electronics, coding…",
                                    }),

                                    // Leader prompts
                                    h("label", { style: styles.label }, "Leader prompts (one per line)"),
                                    h("textarea", {
                                      style: styles.textarea,
                                      value: Array.isArray(mappedReq.leader_prompts) ? mappedReq.leader_prompts.join("\n") : "",
                                      onKeyDown: (e) => {
                                        // Critical: stop CMS/editor key handlers from eating Enter.
                                        if (e.key === "Enter") e.stopPropagation();
                                      },
                                      onInput: (e) => {
                                        const raw = String(e.target.value || "").replace(/\r\n/g, "\n");
                                        // Preserve empty lines while typing so Enter works reliably.
                                        // We'll trim/clean on blur.
                                        const lines = raw.split("\n");
                                        this.updateReqField(b.id, r.no, "leader_prompts", lines);
                                      },
                                      onBlur: (e) => {
                                        const raw = String(e.target.value || "").replace(/\r\n/g, "\n");
                                        const cleaned = raw
                                          .split("\n")
                                          .map((s) => s.trim())
                                          .filter((s) => s.length > 0);
                                        this.updateReqField(b.id, r.no, "leader_prompts", cleaned);
                                      },
                                      placeholder: "Ask: What did you change when it didn’t work?\nAsk: What would you improve next time?",
                                    })
                                  )
                                : null
                            ),

                            mapped
                              ? h("button", { type: "button", style: styles.reqBtn(false), onClick: () => this.removeReq(b.id, r.no) }, "Remove")
                              : h("button", { type: "button", style: styles.reqBtn(true), onClick: () => this.addReq(b, r) }, "Add")
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

  if (!register()) {
    const t = setInterval(() => {
      if (register()) clearInterval(t);
    }, 50);
  }
})();
