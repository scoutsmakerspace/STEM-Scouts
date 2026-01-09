(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ---------- Load master badge data (official) ----------
  let _master = null;
  let _loading = null;

  async function loadMaster() {
    if (_master) return _master;
    if (_loading) return _loading;

    _loading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        // Support either {badges:[...]} or [...]
        const badges = Array.isArray(data) ? data : (data && data.badges) ? data.badges : [];
        _master = badges;
        return _master;
      })
      .catch((e) => {
        console.error("[stem_badge_map_manager] Failed loading badges_master.json:", e);
        _master = [];
        return _master;
      })
      .finally(() => {
        _loading = null;
      });

    return _loading;
  }

  // ---------- Helpers ----------
  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function norm(s) {
    return String(s || "").toLowerCase().trim();
  }

  function safeArray(x) {
    return Array.isArray(x) ? x : [];
  }

  // Existing YAML schema:
  // badges: [
  //   { badge_id, title, section, section_slug, category, badge_type, stem_requirements: [
  //       { rid, ref, text, strength, areas, why_stem, leader_prompts? }
  //   ] }
  // ]
  function ensureBadgeEntryFromMaster(masterBadge) {
    if (!masterBadge) return null;
    const badge_id = masterBadge.badge_id || masterBadge.id || masterBadge.slug;
    const title = masterBadge.title || masterBadge.name || badge_id;
    const section = masterBadge.section || masterBadge.section_name || "";
    const section_slug = masterBadge.section_slug || slugify(section);
    const category = masterBadge.category || masterBadge.badge_category || "";
    const badge_type = masterBadge.badge_type || masterBadge.type || "";

    return {
      badge_id,
      title,
      section,
      section_slug,
      category,
      badge_type,
      stem_requirements: [],
    };
  }

  function extractRequirements(masterBadge) {
    // Try several shapes
    const reqs = masterBadge.requirements || masterBadge.reqs || masterBadge.badge_requirements || [];
    if (Array.isArray(reqs)) {
      return reqs
        .map((r) => {
          if (typeof r === "string") return { ref: r, text: r };
          return r || null;
        })
        .filter(Boolean);
    }
    return [];
  }

  function reqRef(r) {
    // Prefer explicit number-like refs
    const ref = r.ref ?? r.number ?? r.id ?? r.key ?? "";
    return String(ref);
  }

  function reqText(r) {
    return String(r.text ?? r.requirement ?? r.description ?? "");
  }

  function makeRid(badge_id, ref) {
    return `${badge_id}::${ref}`;
  }

  function isNumberedRef(ref) {
    // Keep "1", "2", "3a" etc, but avoid headings like "Aims" or empty.
    const s = String(ref || "").trim();
    if (!s) return false;
    return /^[0-9]+[a-zA-Z]?$/i.test(s);
  }

  function findBadgeInValue(valueArr, badge_id) {
    const arr = safeArray(valueArr);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].badge_id === badge_id) return { idx: i, badge: arr[i] };
    }
    return { idx: -1, badge: null };
  }

  function countMappedReqs(badgeEntry) {
    return safeArray(badgeEntry && badgeEntry.stem_requirements).length;
  }

  function deepClone(x) {
    return JSON.parse(JSON.stringify(x || null));
  }

  // ---------- UI ----------
  function cssBox() {
    return {
      boxSizing: "border-box",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    };
  }

  function btnStyle(kind) {
    const base = {
      padding: "6px 10px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      background: "#fff",
      cursor: "pointer",
      fontSize: "12px",
    };
    if (kind === "add") return Object.assign({}, base, { borderColor: "#2b7", color: "#185" });
    if (kind === "remove") return Object.assign({}, base, { borderColor: "#c55", color: "#933" });
    if (kind === "small") return Object.assign({}, base, { padding: "4px 8px" });
    return base;
  }

  function pillStyle(active) {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "12px",
      border: "1px solid #d0d0d0",
      background: active ? "#e9f8ef" : "#f5f5f5",
      color: active ? "#145" : "#666",
      marginLeft: "8px",
    };
  }

  function register() {
    if (!ready()) return false;

    const h = window.h;
    const createClass = window.createClass;

    const Control = createClass({
      getInitialState() {
        return {
          master: [],
          loading: true,
          q: "",
          open: {}, // badge_id -> bool
          // local cached value, always treat as array
          value: safeArray(this.props.value),
          error: null,
        };
      },

      componentDidMount() {
        loadMaster().then((master) => {
          this.setState({ master: master || [], loading: false });
        });
      },

      componentDidUpdate(prevProps) {
        // Keep local in sync if Decap changes value externally
        if (prevProps.value !== this.props.value) {
          this.setState({ value: safeArray(this.props.value) });
        }
      },

      setValue(nextArr) {
        const clean = safeArray(nextArr);
        this.setState({ value: clean });
        this.props.onChange(clean);
      },

      toggleOpen(badge_id) {
        const open = Object.assign({}, this.state.open);
        open[badge_id] = !open[badge_id];
        this.setState({ open });
      },

      setQuery(e) {
        this.setState({ q: (e && e.target && e.target.value) ? e.target.value : "" });
      },

      // Add requirement to mapping
      addReq(badge_id, masterBadge, req) {
        const value = deepClone(this.state.value) || [];
        const found = findBadgeInValue(value, badge_id);

        let entry = found.badge;
        if (!entry) {
          entry = ensureBadgeEntryFromMaster(masterBadge);
          value.push(entry);
        } else {
          // ensure keys exist
          if (!entry.stem_requirements) entry.stem_requirements = [];
        }

        const ref = reqRef(req);
        const text = reqText(req);

        // Avoid duplicates
        const already = safeArray(entry.stem_requirements).some((sr) => String(sr.ref) === String(ref) || String(sr.rid) === makeRid(badge_id, ref));
        if (already) {
          this.setValue(value);
          return;
        }

        entry.stem_requirements.push({
          rid: makeRid(badge_id, ref),
          ref: String(ref),
          text: text || `${ref}.`,
          strength: "borderline",
          areas: [],
          why_stem: "",
          leader_prompts: "",
        });

        // Keep stable ordering by badge title
        value.sort((a, b) => norm(a.title).localeCompare(norm(b.title)));

        this.setValue(value);
      },

      removeReq(badge_id, ref) {
        const value = deepClone(this.state.value) || [];
        const found = findBadgeInValue(value, badge_id);
        if (!found.badge) return;

        const entry = found.badge;
        entry.stem_requirements = safeArray(entry.stem_requirements).filter((sr) => String(sr.ref) !== String(ref));

        // If badge has no mapped reqs, remove badge entry entirely (keeps UI clean)
        if (entry.stem_requirements.length === 0) {
          value.splice(found.idx, 1);
        }

        this.setValue(value);
      },

      isMapped(badge_id, ref) {
        const found = findBadgeInValue(this.state.value, badge_id);
        if (!found.badge) return false;
        return safeArray(found.badge.stem_requirements).some((sr) => String(sr.ref) === String(ref));
      },

      renderReqRow(badge_id, masterBadge, req) {
        const ref = reqRef(req);
        if (!isNumberedRef(ref)) return null;

        const mapped = this.isMapped(badge_id, ref);
        const rowStyle = {
          padding: "8px 10px",
          borderBottom: "1px solid #eee",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: mapped ? "#eef9f1" : "#fff",
        };

        return h(
          "div",
          { key: `${badge_id}::${ref}`, style: rowStyle },
          h(
            "div",
            { style: { flex: "1 1 auto" } },
            h("div", { style: { fontWeight: 600, marginBottom: "4px" } }, `Req ${ref}`),
            h("div", { style: { fontSize: "12px", color: "#555" } }, reqText(req))
          ),
          mapped
            ? h(
                "button",
                { type: "button", style: btnStyle("remove"), onClick: () => this.removeReq(badge_id, ref) },
                "Remove"
              )
            : h(
                "button",
                { type: "button", style: btnStyle("add"), onClick: () => this.addReq(badge_id, masterBadge, req) },
                "Add"
              )
        );
      },

      renderBadgeCard(masterBadge) {
        const badge_id = masterBadge.badge_id || masterBadge.id || masterBadge.slug;
        const title = masterBadge.title || masterBadge.name || badge_id || "Badge";
        const section = masterBadge.section || masterBadge.section_name || "";
        const category = masterBadge.category || masterBadge.badge_category || "";
        const open = !!this.state.open[badge_id];

        const found = findBadgeInValue(this.state.value, badge_id);
        const mappedCount = found.badge ? countMappedReqs(found.badge) : 0;

        const cardStyle = {
          border: "1px solid #ddd",
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "10px",
          background: mappedCount > 0 ? "#eef9f1" : "#fff",
        };

        const headerStyle = {
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        };

        const metaStyle = { fontSize: "12px", color: "#666", marginTop: "2px" };

        return h(
          "div",
          { key: badge_id, style: cardStyle },
          h(
            "div",
            { style: headerStyle, onClick: () => this.toggleOpen(badge_id) },
            h(
              "div",
              null,
              h("div", { style: { fontWeight: 700 } }, title),
              h("div", { style: metaStyle }, `${section}${section && category ? " · " : ""}${category}`)
            ),
            h("span", { style: pillStyle(mappedCount > 0) }, mappedCount > 0 ? `${mappedCount} mapped` : "—")
          ),
          open
            ? h(
                "div",
                { style: { borderTop: "1px solid #e5e5e5" } },
                safeArray(extractRequirements(masterBadge))
                  .map((req) => this.renderReqRow(badge_id, masterBadge, req))
                  .filter(Boolean),
                h(
                  "div",
                  { style: { padding: "10px 12px", background: "#fafafa", fontSize: "12px", color: "#666" } },
                  "Mapped requirements are saved to _data/stem_badge_map.yml (badges → stem_requirements)."
                )
              )
            : null
        );
      },

      render() {
        const q = norm(this.state.q);
        const master = safeArray(this.state.master);

        // Filter badges by badge title OR requirement text
        const filtered = q
          ? master.filter((b) => {
              const title = norm(b.title || b.name || b.badge_id || b.id || "");
              if (title.includes(q)) return true;
              const reqs = safeArray(extractRequirements(b));
              return reqs.some((r) => norm(reqText(r)).includes(q) || norm(reqRef(r)).includes(q));
            })
          : master;

        return h(
          "div",
          { style: Object.assign(cssBox(), { padding: "12px" }) },
          h("div", { style: { fontSize: "18px", fontWeight: 800, marginBottom: "6px" } }, "STEM Badge Map Manager"),
          h(
            "div",
            { style: { color: "#666", fontSize: "13px", marginBottom: "12px" } },
            "Search a badge, expand it, then Add/Remove individual requirements. This avoids flaky behaviour from many separate files."
          ),

          h("input", {
            type: "text",
            value: this.state.q,
            onInput: this.setQuery,
            placeholder: "Search badge name or requirement text…",
            style: {
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "12px",
              fontSize: "14px",
            },
          }),

          this.state.loading
            ? h("div", { style: { color: "#666", padding: "8px 0" } }, "Loading badges…")
            : null,

          filtered.map((b) => this.renderBadgeCard(b)),

          !this.state.loading && filtered.length === 0
            ? h("div", { style: { color: "#666", padding: "8px 0" } }, "No badges match your search.")
            : null
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

  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    if (register() || tries > 120) clearInterval(t);
  }, 100);
})();