(function () {
  function ready() {
    return typeof window !== "undefined" && window.CMS && window.createClass && window.h;
  }

  const SECTION_OPTIONS = [
    "squirrels",
    "beavers",
    "cubs",
    "scouts",
    "explorers",
  ];

  const CATEGORY_OPTIONS = [
    "Activity Badges",
    "Staged Activity Badges",
    "Challenge Awards",
  ];

  const STATUS_OPTIONS = ["active", "retired"];

  function badgeTypeFromCategory(category) {
    const c = String(category || "").toLowerCase();
    if (c.includes("challenge")) return "Challenge";
    if (c.includes("staged")) return "Staged";
    return "Activity";
  }

  function slugifyId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function safeJsonFetch(url) {
    return fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
      return r.json();
    });
  }

  function getBaseUrl() {
    // Works for both /admin/ and /STEM-Scouts/admin/
    const p = window.location.pathname;
    const idx = p.toLowerCase().indexOf("/admin");
    if (idx === -1) return "";
    return p.slice(0, idx);
  }

  function extractReqTexts(badge) {
    // badges_master.json stores requirements as a list of objects, including headings.
    // For editing, we only keep the actual requirement lines.
    const reqs = badge && badge.requirements;
    if (!Array.isArray(reqs)) return [];
    return reqs
      .filter((r) => r && (r.kind === "req" || r.no || r.text))
      .map((r) => String((r && r.text) || "").trim())
      .filter((t) => t.length > 0);
  }

  function normalizeOverride(o) {
    const id = slugifyId(o && o.id);
    if (!id) return null;
    const title = String((o && o.title) || "").trim();
    const section = String((o && o.section) || "").trim();
    const category = String((o && o.category) || "").trim();
    const status = String((o && o.status) || "active").trim();
    const badge_type = badgeTypeFromCategory(category);
    const icon = String((o && o.icon) || "").trim();
    const completion_rules = String((o && o.completion_rules) || "").trim();
    const requirements_in = o && o.requirements;
    const requirements = Array.isArray(requirements_in)
      ? requirements_in.map((x) => String(x || "").trim()).filter((t) => t)
      : [];
    return {
      id,
      title,
      section,
      category,
      badge_type,
      ...(icon ? { icon } : {}),
      ...(completion_rules ? { completion_rules } : {}),
      ...(requirements.length ? { requirements } : {}),
      status: STATUS_OPTIONS.includes(status) ? status : "active",
    };
  }

  function mergeMasterAndOverrides(masterBadges, overrides) {
    const map = new Map();

    (masterBadges || []).forEach((b) => {
      if (!b || !b.id) return;
      map.set(String(b.id), {
        id: String(b.id),
        title: b.title || b.badge_name || "",
        section: b.section || "",
        category: b.category || "",
        badge_type: b.badge_type || badgeTypeFromCategory(b.category),
        status: b.status || "active",
        icon: b.icon || "",
        // For display only; editing converts to a simple list of strings.
        requirements: b.requirements || [],
        _source: "master",
      });
    });

    (overrides || []).forEach((o) => {
      const n = normalizeOverride(o);
      if (!n) return;
      const existing = map.get(n.id);
      if (existing) {
        map.set(n.id, {
          ...existing,
          ...n,
          _source: "override",
        });
      } else {
        map.set(n.id, {
          ...n,
          _source: "override",
        });
      }
    });

    return Array.from(map.values());
  }

  const STYLES = {
    wrap: {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      maxWidth: "1200px",
      padding: "12px 8px",
    },
    header: {
      marginBottom: "10px",
    },
    subtitle: {
      marginTop: "4px",
      opacity: 0.8,
      fontSize: "13px",
      lineHeight: 1.35,
    },
    toolbar: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      alignItems: "center",
      margin: "14px 0 12px",
    },
    input: {
      minWidth: "240px",
      padding: "8px 10px",
      border: "1px solid #d0d7de",
      borderRadius: "8px",
      fontSize: "14px",
    },
    select: {
      padding: "8px 10px",
      border: "1px solid #d0d7de",
      borderRadius: "8px",
      fontSize: "14px",
      background: "white",
    },
    btn: {
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1px solid #d0d7de",
      background: "#ffffff",
      cursor: "pointer",
      fontSize: "14px",
    },
    btnPrimary: {
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1px solid #1f2328",
      background: "#1f2328",
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 10px",
      borderRadius: "999px",
      border: "1px solid #d0d7de",
      background: "#f6f8fa",
      fontSize: "12px",
    },
    table: {
      border: "1px solid #d0d7de",
      borderRadius: "12px",
      overflow: "hidden",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "220px 1.2fr 140px 200px 120px 160px",
      columnGap: "0px",
      alignItems: "center",
    },
    cell: {
      padding: "10px 12px",
      borderBottom: "1px solid #eaeef2",
      fontSize: "14px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    headCell: {
      padding: "10px 12px",
      borderBottom: "1px solid #d0d7de",
      fontWeight: 600,
      fontSize: "13px",
      background: "#f6f8fa",
    },
    link: {
      color: "#0969da",
      textDecoration: "none",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "12px",
    },
    sectionHeader: {
      padding: "10px 12px",
      background: "#fff",
      borderBottom: "1px solid #eaeef2",
      fontWeight: 700,
      fontSize: "13px",
    },
    actions: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
    modalBackdrop: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "16px",
    },
    modal: {
      width: "min(720px, 100%)",
      background: "#fff",
      borderRadius: "14px",
      border: "1px solid #d0d7de",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      overflow: "hidden",
    },
    modalHead: {
      padding: "12px 14px",
      borderBottom: "1px solid #eaeef2",
      fontWeight: 700,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
    },
    modalBody: {
      padding: "14px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "12px",
      fontWeight: 600,
      opacity: 0.9,
    },
    hint: {
      fontSize: "12px",
      opacity: 0.75,
      lineHeight: 1.3,
    },
    modalFoot: {
      padding: "12px 14px",
      borderTop: "1px solid #eaeef2",
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      flexWrap: "wrap",
    },
    err: {
      padding: "10px 12px",
      border: "1px solid #ffcecc",
      background: "#fff5f5",
      borderRadius: "12px",
      color: "#cf222e",
      marginTop: "10px",
      whiteSpace: "pre-wrap",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "12px",
    },
  };

  const Control = window.createClass({
    getInitialState() {
      return {
        loading: true,
        error: null,
        master: [],
        q: "",
        filterSection: "all",
        filterCategory: "all",
        filterStatus: "all",
        groupBySection: true,
        editing: null, // {mode:'new'|'edit', badge, idTouched}
      };
    },

    componentDidMount() {
      this.loadMaster();
    },

    loadMaster() {
      const base = getBaseUrl();
      const url = `${base}/admin/badges_master.json`;
      safeJsonFetch(url)
        .then((data) => {
          // badges_master.json may be either:
          //  - an array (current repo format)
          //  - an object { badges: [...] } (older/alternate format)
          const badges = Array.isArray(data) ? data : Array.isArray(data && data.badges) ? data.badges : [];
          this.setState({ master: badges, loading: false, error: null });
        })
        .catch((e) => {
          this.setState({ loading: false, error: String(e && e.message ? e.message : e) });
        });
    },

    _extractReqTexts(badge) {
      // Convert master format (heading + req objects) into simple list of strings.
      const reqs = badge && badge.requirements;
      if (!Array.isArray(reqs)) return [];
      const out = [];
      for (const r of reqs) {
        if (!r) continue;
        if (typeof r === "string") {
          const t = r.trim();
          if (t) out.push(t);
          continue;
        }
        if (typeof r === "object") {
          if (r.kind && r.kind !== "req") continue;
          const t = String(r.text || "").trim();
          if (t) out.push(t);
        }
      }
      return out;
    },

    getOverrides() {
      const v = this.props.value;
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      }
      return [];
    },

    setOverrides(nextOverrides) {
      // Keep the stored data small + consistent.
      const cleaned = (nextOverrides || [])
        .map(normalizeOverride)
        .filter(Boolean)
        .sort((a, b) => a.id.localeCompare(b.id));
      this.props.onChange(cleaned);
    },

    openNew() {
      this.setState({
        editing: {
          mode: "new",
          idTouched: false,
          badge: {
            id: "",
            title: "",
            section: "beavers",
            category: "Activity Badges",
            status: "active",
            icon: "",
            requirements: [],
          },
        },
      });
    },

    openEdit(badge) {
      this.setState({
        editing: {
          mode: "edit",
          idTouched: true, // don’t auto overwrite IDs on existing
          badge: {
            id: badge.id,
            title: badge.title || "",
            section: badge.section || "",
            category: badge.category || "",
            status: badge.status || "active",
            icon: badge.icon || "",
            requirements: this._extractReqTexts(badge),
          },
        },
      });
    },

    closeEdit() {
      this.setState({ editing: null });
    },

    saveEdit() {
      const ed = this.state.editing;
      if (!ed) return;

      const raw = ed.badge || {};
      const id = slugifyId(raw.id || raw.title);
      const title = String(raw.title || "").trim();
      const section = String(raw.section || "").trim();
      const category = String(raw.category || "").trim();
      const status = String(raw.status || "active").trim();
      const icon = String(raw.icon || "").trim();
      const reqs = Array.isArray(raw.requirements) ? raw.requirements : [];
      const requirements = reqs
        .map((x) => String(x || "").trim())
        .filter((x) => x.length > 0);

      if (!id) {
        this.setState({ error: "Badge ID is required." });
        return;
      }
      if (!title) {
        this.setState({ error: "Badge title is required." });
        return;
      }
      if (!SECTION_OPTIONS.includes(section)) {
        this.setState({ error: "Please choose a valid section." });
        return;
      }
      if (!CATEGORY_OPTIONS.includes(category)) {
        this.setState({ error: "Please choose a valid category." });
        return;
      }
      if (!STATUS_OPTIONS.includes(status)) {
        this.setState({ error: "Please choose a valid status." });
        return;
      }

      const overrides = this.getOverrides();
      const next = overrides.slice();
      const idx = next.findIndex((o) => String(o.id) === id);

      const payload = {
        id,
        title,
        section,
        category,
        status,
        badge_type: badgeTypeFromCategory(category),
        icon,
        requirements,
      };

      if (idx >= 0) next[idx] = payload;
      else next.push(payload);

      this.setOverrides(next);
      this.setState({ editing: null, error: null });
    },

    setStatus(badge, nextStatus) {
      const overrides = this.getOverrides();
      const next = overrides.slice();
      const idx = next.findIndex((o) => String(o.id) === String(badge.id));

      const payload = {
        id: badge.id,
        title: badge.title,
        section: badge.section,
        category: badge.category,
        status: nextStatus,
        badge_type: badgeTypeFromCategory(badge.category),
        icon: badge.icon || "",
        requirements: this._extractReqTexts(badge),
      };

      if (idx >= 0) next[idx] = payload;
      else next.push(payload);

      this.setOverrides(next);
    },

    getFilteredBadges() {
      const merged = mergeMasterAndOverrides(this.state.master, this.getOverrides());

      const q = String(this.state.q || "").trim().toLowerCase();
      const fSection = this.state.filterSection;
      const fCategory = this.state.filterCategory;
      const fStatus = this.state.filterStatus;

      return merged
        .filter((b) => {
          if (fSection !== "all" && String(b.section) !== fSection) return false;
          if (fCategory !== "all" && String(b.category) !== fCategory) return false;
          if (fStatus !== "all" && String(b.status) !== fStatus) return false;
          if (!q) return true;
          const hay = `${b.id} ${b.title} ${b.section} ${b.category}`.toLowerCase();
          return hay.includes(q);
        })
        .sort((a, b) => {
          const as = String(a.section || "");
          const bs = String(b.section || "");
          if (as !== bs) return as.localeCompare(bs);
          return String(a.title || a.id).localeCompare(String(b.title || b.id));
        });
    },

    renderTableRows(items) {
      const rows = [];
      const bySection = new Map();
      items.forEach((b) => {
        const s = String(b.section || "other");
        if (!bySection.has(s)) bySection.set(s, []);
        bySection.get(s).push(b);
      });

      const sections = Array.from(bySection.keys()).sort((a, b) => a.localeCompare(b));

      sections.forEach((sec) => {
        if (this.state.groupBySection) {
          rows.push(
            window.h(
              "div",
              { key: `sec-${sec}`, style: STYLES.sectionHeader },
              sec
            )
          );
        }

        (bySection.get(sec) || []).forEach((b) => {
          rows.push(this.renderRow(b));
        });
      });

      return rows;
    },

    renderRow(b) {
      const isRetired = String(b.status) === "retired";
      const rowStyle = {
        ...STYLES.row,
        background: isRetired ? "#fafbfc" : "#fff",
        opacity: isRetired ? 0.7 : 1,
      };

      const base = getBaseUrl();
      const link = `${base}/badges/#${encodeURIComponent(b.id)}`;

      return window.h(
        "div",
        { key: b.id, style: rowStyle },
        window.h(
          "div",
          { style: STYLES.cell },
          window.h(
            "a",
            { href: link, target: "_blank", rel: "noopener", style: STYLES.link },
            b.id
          )
        ),
        window.h("div", { style: STYLES.cell, title: b.title }, b.title || "—"),
        window.h("div", { style: STYLES.cell }, b.section || "—"),
        window.h("div", { style: STYLES.cell }, b.category || "—"),
        window.h("div", { style: STYLES.cell }, b.status || "active"),
        window.h(
          "div",
          { style: { ...STYLES.cell, borderBottom: "1px solid #eaeef2" } },
          window.h(
            "div",
            { style: STYLES.actions },
            window.h(
              "button",
              { style: STYLES.btn, onClick: () => this.openEdit(b) },
              "Edit"
            ),
            window.h(
              "button",
              {
                style: STYLES.btn,
                onClick: () => this.setStatus(b, isRetired ? "active" : "retired"),
              },
              isRetired ? "Restore" : "Retire"
            )
          )
        )
      );
    },

    renderModal() {
      const ed = this.state.editing;
      if (!ed) return null;

      const b = ed.badge;

      const update = (key, value) => {
        const next = { ...b, [key]: value };

        // Auto-generate ID from title until the user touches the ID field.
        if (key === "title" && !ed.idTouched) {
          next.id = slugifyId(value);
        }

        this.setState({ editing: { ...ed, badge: next } });
      };

      const onIdChange = (value) => {
        const next = { ...b, id: slugifyId(value) };
        this.setState({ editing: { ...ed, idTouched: true, badge: next } });
      };

      return window.h(
        "div",
        { style: STYLES.modalBackdrop, onClick: () => this.closeEdit() },
        window.h(
          "div",
          { style: STYLES.modal, onClick: (e) => e.stopPropagation() },
          window.h(
            "div",
            { style: STYLES.modalHead },
            window.h(
              "div",
              null,
              ed.mode === "new" ? "Add new badge" : `Edit badge: ${b.id}`
            ),
            window.h(
              "button",
              { style: STYLES.btn, onClick: () => this.closeEdit() },
              "Close"
            )
          ),
          window.h(
            "div",
            { style: STYLES.modalBody },
            window.h(
              "div",
              { style: { ...STYLES.field, gridColumn: "1 / span 2" } },
              window.h("div", { style: STYLES.label }, "Title"),
              window.h("input", {
                style: STYLES.input,
                value: b.title,
                onChange: (e) => update("title", e.target.value),
                placeholder: "e.g. My new badge",
              })
            ),
            window.h(
              "div",
              { style: STYLES.field },
              window.h("div", { style: STYLES.label }, "Canonical ID"),
              window.h("input", {
                style: STYLES.input,
                value: b.id,
                onChange: (e) => onIdChange(e.target.value),
                placeholder: "e.g. beavers-my-new-badge",
              }),
              window.h(
                "div",
                { style: STYLES.hint },
                "Lowercase, hyphenated. Don’t change after publishing."
              )
            ),
            window.h(
              "div",
              { style: STYLES.field },
              window.h("div", { style: STYLES.label }, "Status"),
              window.h(
                "select",
                {
                  style: STYLES.select,
                  value: b.status,
                  onChange: (e) => update("status", e.target.value),
                },
                STATUS_OPTIONS.map((s) => window.h("option", { key: s, value: s }, s))
              )
            ),
            window.h(
              "div",
              { style: STYLES.field },
              window.h("div", { style: STYLES.label }, "Section"),
              window.h(
                "select",
                {
                  style: STYLES.select,
                  value: b.section,
                  onChange: (e) => update("section", e.target.value),
                },
                SECTION_OPTIONS.map((s) => window.h("option", { key: s, value: s }, s))
              )
            ),
            window.h(
              "div",
              { style: STYLES.field },
              window.h("div", { style: STYLES.label }, "Category"),
              window.h(
                "select",
                {
                  style: STYLES.select,
                  value: b.category,
                  onChange: (e) => update("category", e.target.value),
                },
                CATEGORY_OPTIONS.map((c) => window.h("option", { key: c, value: c }, c))
              ),
              window.h(
                "div",
                { style: STYLES.hint },
                `Badge type is auto-set to “${badgeTypeFromCategory(b.category)}”.`
              )
            )

            ,
            window.h(
              "div",
              { style: { ...STYLES.field, gridColumn: "1 / span 2" } },
              window.h("div", { style: STYLES.label }, "Icon (optional)"),
              window.h("input", {
                style: STYLES.input,
                value: b.icon || "",
                onChange: (e) => update("icon", e.target.value),
                placeholder: "/assets/images/badges/<id>.png",
              }),
              window.h(
                "div",
                { style: STYLES.hint },
                "If you upload an icon in the CMS media library, paste its path here. If left blank, the site will use /assets/images/badges/<id>.png."
              )
            ),
            window.h(
              "div",
              { style: { ...STYLES.field, gridColumn: "1 / span 2" } },
              window.h("div", { style: STYLES.label }, "Requirements"),
              window.h(
                "div",
                { style: { display: "grid", gap: "8px" } },
                (Array.isArray(b.requirements) ? b.requirements : []).map((t, idx) =>
                  window.h(
                    "div",
                    { key: idx, style: { display: "flex", gap: "8px", alignItems: "flex-start" } },
                    window.h("textarea", {
                      style: { ...STYLES.input, minHeight: "60px", width: "100%" },
                      value: t,
                      onChange: (e) => {
                        const next = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                        next[idx] = e.target.value;
                        update("requirements", next);
                      },
                      placeholder: `Requirement ${idx + 1} text...`,
                    }),
                    window.h(
                      "button",
                      {
                        style: STYLES.btn,
                        onClick: () => {
                          const next = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                          next.splice(idx, 1);
                          update("requirements", next);
                        },
                      },
                      "Remove"
                    )
                  )
                )
              ),
              window.h(
                "div",
                { style: { marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" } },
                window.h(
                  "button",
                  {
                    style: STYLES.btn,
                    onClick: () => {
                      const next = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                      next.push("");
                      update("requirements", next);
                    },
                  },
                  "Add requirement"
                ),
                window.h(
                  "button",
                  {
                    style: STYLES.btn,
                    onClick: () => update("requirements", []),
                  },
                  "Clear"
                )
              ),
              window.h(
                "div",
                { style: STYLES.hint },
                "Numbering is automatic. Just add one requirement per box."
              )
            )
          ),
          window.h(
            "div",
            { style: STYLES.modalFoot },
            window.h(
              "button",
              { style: STYLES.btn, onClick: () => this.closeEdit() },
              "Cancel"
            ),
            window.h(
              "button",
              { style: STYLES.btnPrimary, onClick: () => this.saveEdit() },
              "Save"
            )
          )
        )
      );
    },

    render() {
      const overrides = this.getOverrides();
      const filtered = this.getFilteredBadges();

      return window.h(
        "div",
        { style: STYLES.wrap },
        window.h(
          "div",
          { style: STYLES.header },
          window.h("h2", { style: { margin: 0 } }, "Badges Manager"),
          window.h(
            "div",
            { style: STYLES.subtitle },
            "Add new badges and retire badges safely. Deletion is not supported. Retired badges will be pruned from mapping and activities by the site’s generation scripts/workflows."
          )
        ),

        window.h(
          "div",
          { style: STYLES.toolbar },
          window.h("input", {
            style: STYLES.input,
            value: this.state.q,
            onChange: (e) => this.setState({ q: e.target.value }),
            placeholder: "Search by ID, title, section…",
          }),
          window.h(
            "select",
            {
              style: STYLES.select,
              value: this.state.filterSection,
              onChange: (e) => this.setState({ filterSection: e.target.value }),
            },
            window.h("option", { value: "all" }, "All sections"),
            SECTION_OPTIONS.map((s) => window.h("option", { key: s, value: s }, s))
          ),
          window.h(
            "select",
            {
              style: STYLES.select,
              value: this.state.filterCategory,
              onChange: (e) => this.setState({ filterCategory: e.target.value }),
            },
            window.h("option", { value: "all" }, "All categories"),
            CATEGORY_OPTIONS.map((c) => window.h("option", { key: c, value: c }, c))
          ),
          window.h(
            "select",
            {
              style: STYLES.select,
              value: this.state.filterStatus,
              onChange: (e) => this.setState({ filterStatus: e.target.value }),
            },
            window.h("option", { value: "all" }, "All statuses"),
            STATUS_OPTIONS.map((s) => window.h("option", { key: s, value: s }, s))
          ),
          window.h(
            "button",
            {
              style: STYLES.btn,
              onClick: () => this.setState({ groupBySection: !this.state.groupBySection }),
            },
            this.state.groupBySection ? "Ungroup" : "Group by section"
          ),
          window.h(
            "button",
            { style: STYLES.btnPrimary, onClick: () => this.openNew() },
            "Add new badge"
          ),
          window.h(
            "span",
            { style: STYLES.badge },
            `Overrides: ${overrides.length}`
          )
        ),

        this.state.loading
          ? window.h("div", null, "Loading badges…")
          : window.h(
              "div",
              { style: STYLES.table },
              window.h(
                "div",
                { style: STYLES.row },
                window.h("div", { style: STYLES.headCell }, "ID"),
                window.h("div", { style: STYLES.headCell }, "Title"),
                window.h("div", { style: STYLES.headCell }, "Section"),
                window.h("div", { style: STYLES.headCell }, "Category"),
                window.h("div", { style: STYLES.headCell }, "Status"),
                window.h("div", { style: STYLES.headCell }, "Actions")
              ),
              this.renderTableRows(filtered)
            ),

        this.state.error ? window.h("div", { style: STYLES.err }, this.state.error) : null,
        this.renderModal()
      );
    },
  });

  function register() {
    window.CMS.registerWidget("badges_manager", Control);
  }

  if (ready()) register();
  else {
    const t = setInterval(() => {
      if (!ready()) return;
      clearInterval(t);
      register();
    }, 50);
  }
})();
