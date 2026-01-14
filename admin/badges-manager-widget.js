(function () {
  function ready() {
    return typeof window !== "undefined" && window.CMS && window.createClass && window.h;
  }

  var SECTION_OPTIONS = ["squirrels", "beavers", "cubs", "scouts", "explorers"];
  var CATEGORY_OPTIONS = ["Activity Badges", "Staged Activity Badges", "Challenge Awards"];
  var STATUS_OPTIONS = ["active", "retired"];

  function assign(target) {
    target = target || {};
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
    }
    return target;
  }

  function badgeTypeFromCategory(category) {
    var c = String(category || "").toLowerCase();
    if (c.indexOf("challenge") !== -1) return "Challenge";
    if (c.indexOf("staged") !== -1) return "Staged";
    return "Activity";
  }


function goToMedia() {
  try {
    var base = String(window.location && window.location.href ? window.location.href : "").split("#")[0];
    window.location.href = base + "#/media";
  } catch (e) {
    try { window.location.hash = "/media"; } catch (_) {}
  }
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
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function getBaseUrl() {
    var p = window.location.pathname;
    var idx = p.toLowerCase().indexOf("/admin");
    if (idx === -1) return "";
    return p.slice(0, idx);
  }

  
function getBackend() {
  try { return window.CMS && window.CMS.getBackend && window.CMS.getBackend(); } catch (_) { return null; }
}

function persistBadgeIconPng(file, badgeId) {
  return new Promise(function (resolve, reject) {
    try {
      var backend = getBackend();
      if (!backend || !backend.persistMedia) return reject(new Error("CMS backend does not support media uploads here."));
      if (!file) return reject(new Error("No file selected."));

      // Force canonical filename: <id>.png
      var renamed;
      try {
        renamed = new File([file], badgeId + ".png", { type: "image/png" });
      } catch (e) {
        // Fallback: if File constructor is blocked, just use original file name (best effort)
        renamed = file;
      }

      var opts = { path: "/assets/images/badges" };
      Promise.resolve(backend.persistMedia(renamed, opts))
        .then(function (res) {
          // Different backends return different shapes
          var url = "";
          if (res && typeof res === "object") {
            url = res.url || res.path || "";
            if (!url && res[0]) url = res[0].url || res[0].path || "";
          }
          resolve(url || ("/assets/images/badges/" + badgeId + ".png"));
        })
        .catch(function (err) { reject(err); });
    } catch (err2) {
      reject(err2);
    }
  });
}

function normalizeOverride(o) {
    var id = slugifyId(o && o.id);
    if (!id) return null;

    var title = String((o && o.title) || "").trim();
    var section = String((o && o.section) || "").trim();
    var category = String((o && o.category) || "").trim();
    var status = String((o && o.status) || "active").trim();
    var icon = String((o && o.icon) || "").trim();

    var requirements_in = o && o.requirements;
    var requirements = [];
    if (Array.isArray(requirements_in)) {
      for (var i = 0; i < requirements_in.length; i++) {
        var t = String(requirements_in[i] || "").trim();
        if (t) requirements.push(t);
      }
    }

    var out = {
      id: id,
      title: title,
      section: section,
      category: category,
      badge_type: badgeTypeFromCategory(category),
      status: STATUS_OPTIONS.indexOf(status) !== -1 ? status : "active"
    };

    if (icon) out.icon = icon;
    if (requirements.length) out.requirements = requirements;
    return out;
  }

  function mergeMasterAndOverrides(masterBadges, overrides) {
    var map = {};
    var i, b, id;

    masterBadges = masterBadges || [];
    for (i = 0; i < masterBadges.length; i++) {
      b = masterBadges[i];
      if (!b || !b.id) continue;
      id = String(b.id);
      map[id] = {
        id: id,
        title: b.title || b.badge_name || "",
        section: b.section || "",
        category: b.category || "",
        badge_type: b.badge_type || badgeTypeFromCategory(b.category),
        status: b.status || "active",
        icon: b.icon || "",
        requirements: b.requirements || [],
        _source: "master"
      };
    }

    overrides = overrides || [];
    for (i = 0; i < overrides.length; i++) {
      var n = normalizeOverride(overrides[i]);
      if (!n) continue;
      id = String(n.id);
      if (map[id]) map[id] = assign({}, map[id], n, { _source: "override" });
      else map[id] = assign({}, n, { _source: "override" });
    }

    var arr = [];
    for (id in map) if (Object.prototype.hasOwnProperty.call(map, id)) arr.push(map[id]);
    arr.sort(function (a, b2) {
      var as = String(a.section || "");
      var bs = String(b2.section || "");
      if (as !== bs) return as.localeCompare(bs);
      return String(a.title || a.id).localeCompare(String(b2.title || b2.id));
    });
    return arr;
  }

  function resolveIconFromId(id, stage) {
    // stage 0 -> 64, stage 1 -> full, stage 2 -> missing
    if (!id) return "";
    if (stage === 0) return "/assets/images/badges/" + id + "_64.png";
    if (stage === 1) return "/assets/images/badges/" + id + ".png";
    return "/assets/images/badges/_missing.png";
  }

  var STYLES = {
    wrap: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", maxWidth: "1280px", padding: "12px 8px" },
    header: { marginBottom: "10px" },
    subtitle: { marginTop: "4px", opacity: 0.8, fontSize: "13px", lineHeight: 1.35 },

    toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", margin: "14px 0 12px" },
    input: { minWidth: "240px", padding: "8px 10px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px" },
    select: { padding: "8px 10px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", background: "white" },
    btn: { padding: "8px 12px", borderRadius: "10px", border: "1px solid #d0d7de", background: "#ffffff", cursor: "pointer", fontSize: "14px" },
    btnPrimary: { padding: "8px 12px", borderRadius: "10px", border: "1px solid #1f2328", background: "#1f2328", color: "#fff", cursor: "pointer", fontSize: "14px" },
    pill: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px", borderRadius: "999px", border: "1px solid #d0d7de", background: "#f6f8fa", fontSize: "12px" },

    table: { border: "1px solid #d0d7de", borderRadius: "12px", overflow: "hidden", background: "#fff" },
    row: { display: "grid", gridTemplateColumns: "28px 1.6fr 140px 240px 120px", alignItems: "center" },
    cell: { padding: "10px 12px", borderBottom: "1px solid #eaeef2", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    headCell: { padding: "10px 12px", borderBottom: "1px solid #d0d7de", fontWeight: 600, fontSize: "13px", background: "#f6f8fa" },
    expanderCell: { cursor: "pointer", userSelect: "none", fontSize: "14px", color: "#334155", textAlign: "center" },
    sectionHeader: { padding: "10px 12px", background: "#fff", borderBottom: "1px solid #eaeef2", fontWeight: 700, fontSize: "13px" },

    expandWrap: { borderBottom: "1px solid #eaeef2", background: "#fbfdff", padding: "12px 12px 14px" },
    expandGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "start" },
    expandLabel: { fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" },
    expandCode: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "12px", padding: "2px 6px", border: "1px solid #dbe2ea", borderRadius: "6px", background: "#fff", display: "inline-block" },
    muted: { color: "#64748b", fontSize: "13px" },
    iconPreview: { width: "72px", height: "72px", objectFit: "contain", border: "1px solid #dbe2ea", borderRadius: "10px", background: "#ffffff" },
    miniPath: { marginTop: "6px", fontSize: "12px", color: "#64748b", wordBreak: "break-word" },
    reqList: { margin: "6px 0 0 18px", padding: 0 },
    reqItem: { marginBottom: "4px" },
    actions: { display: "flex", gap: "8px", flexWrap: "wrap" },

    err: { padding: "10px 12px", border: "1px solid #ffcecc", background: "#fff5f5", borderRadius: "12px", color: "#cf222e", marginTop: "10px", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "12px" },

    // Simple modal
    modalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 99999, padding: "16px", overflowY: "auto" },
    modal: { width: "min(720px, 100%)", maxHeight: "calc(100vh - 32px)", background: "#fff", borderRadius: "14px", border: "1px solid #d0d7de", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" },
    modalHead: { padding: "12px 14px", borderBottom: "1px solid #eaeef2", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
    modalBody: { padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", overflowY: "auto" },
    field: { display: "flex", flexDirection: "column", gap: "6px" },
    label: { fontSize: "12px", fontWeight: 600, opacity: 0.9 },
    hint: { fontSize: "12px", opacity: 0.75, lineHeight: 1.3 },
    modalFoot: { padding: "12px 14px", borderTop: "1px solid #eaeef2", display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }
  };

  var Control = window.createClass({
    getInitialState: function () {
      return {
        loading: true,
        error: null,
        master: [],
        q: "",
        filterSection: "all",
        filterCategory: "all",
        filterStatus: "all",
        groupBySection: true,
        expandedId: null,
        iconStage: {}, // id -> 0/1/2
        editing: null, // {mode, idTouched, badge}
        uploadingIcon: false
      };
    },

    componentDidMount: function () {
      this.loadMaster();
    },

    loadMaster: function () {
      var self = this;
      var base = getBaseUrl();
      var url = base + "/admin/badges_master.json";
      safeJsonFetch(url)
        .then(function (data) {
          var badges = Array.isArray(data) ? data : (Array.isArray(data && data.badges) ? data.badges : []);
          self.setState({ master: badges, loading: false, error: null });
        })
        .catch(function (e) {
          self.setState({ loading: false, error: String(e && e.message ? e.message : e) });
        });
    },

    getOverrides: function () {
      var v = this.props.value;
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          var parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      }
      return [];
    },

    setOverrides: function (nextOverrides) {
      var cleaned = [];
      var i;
      nextOverrides = nextOverrides || [];
      for (i = 0; i < nextOverrides.length; i++) {
        var n = normalizeOverride(nextOverrides[i]);
        if (n) cleaned.push(n);
      }
      cleaned.sort(function (a, b) { return a.id.localeCompare(b.id); });
      this.props.onChange(cleaned);
    },

    toggleExpand: function (id) {
      this.setState({ expandedId: this.state.expandedId === id ? null : id });
      var next = assign({}, this.state.iconStage);
      next[id] = 0;
      this.setState({ iconStage: next });
    },

    _extractReqTexts: function (badge) {
      var reqs = badge && badge.requirements;
      if (!Array.isArray(reqs)) return [];
      var out = [];
      for (var i = 0; i < reqs.length; i++) {
        var r = reqs[i];
        if (!r) continue;
        if (typeof r === "string") {
          var t = r.trim();
          if (t) out.push(t);
        } else if (typeof r === "object") {
          if (r.kind && r.kind !== "req") continue;
          var tt = String(r.text || "").trim();
          if (tt) out.push(tt);
        }
      }
      return out;
    },

    openNew: function () {
      this.setState({
        editing: {
          mode: "new",
          idTouched: false,
          badge: { id: "", title: "", section: "beavers", category: "Activity Badges", status: "active", icon: "", requirements: [] }
        }
      });
    },

    openEdit: function (badge) {
      this.setState({
        editing: {
          mode: "edit",
          idTouched: true,
          badge: {
            id: badge.id,
            title: badge.title || "",
            section: badge.section || "",
            category: badge.category || "",
            status: badge.status || "active",
            icon: badge.icon || "",
            requirements: this._extractReqTexts(badge)
          }
        }
      });
    },

    closeEdit: function () {
      this.setState({ editing: null });
    },

    saveEdit: function () {
      var ed = this.state.editing;
      if (!ed) return;

      var raw = ed.badge || {};
      var id = slugifyId(raw.id || raw.title);
      var title = String(raw.title || "").trim();
      var section = String(raw.section || "").trim();
      var category = String(raw.category || "").trim();
      var status = String(raw.status || "active").trim();
      var icon = String(raw.icon || "").trim();
      var reqs = Array.isArray(raw.requirements) ? raw.requirements : [];
      var requirements = [];
      for (var i = 0; i < reqs.length; i++) {
        var t = String(reqs[i] || "").trim();
        if (t) requirements.push(t);
      }

      if (!id) return this.setState({ error: "Badge ID is required." });
      if (!title) return this.setState({ error: "Badge title is required." });
      if (SECTION_OPTIONS.indexOf(section) === -1) return this.setState({ error: "Please choose a valid section." });
      if (CATEGORY_OPTIONS.indexOf(category) === -1) return this.setState({ error: "Please choose a valid category." });
      if (STATUS_OPTIONS.indexOf(status) === -1) return this.setState({ error: "Please choose a valid status." });

      var overrides = this.getOverrides();
      var next = overrides.slice();
      var idx = -1;
      for (i = 0; i < next.length; i++) if (String(next[i].id) === id) { idx = i; break; }

      var payload = { id: id, title: title, section: section, category: category, status: status, badge_type: badgeTypeFromCategory(category), icon: icon, requirements: requirements };
      if (idx >= 0) next[idx] = payload;
      else next.push(payload);

      this.setOverrides(next);
      this.setState({ editing: null, error: null });
    },

    setStatus: function (badge, nextStatus) {
      var overrides = this.getOverrides();
      var next = overrides.slice();
      var idx = -1;
      for (var i = 0; i < next.length; i++) if (String(next[i].id) === String(badge.id)) { idx = i; break; }

      var payload = {
        id: badge.id,
        title: badge.title,
        section: badge.section,
        category: badge.category,
        status: nextStatus,
        badge_type: badgeTypeFromCategory(badge.category),
        icon: badge.icon || "",
        requirements: this._extractReqTexts(badge)
      };

      if (idx >= 0) next[idx] = payload;
      else next.push(payload);

      this.setOverrides(next);
    },

    getFilteredBadges: function () {
      var merged = mergeMasterAndOverrides(this.state.master, this.getOverrides());
      var q = String(this.state.q || "").trim().toLowerCase();
      var fSection = this.state.filterSection;
      var fCategory = this.state.filterCategory;
      var fStatus = this.state.filterStatus;

      var out = [];
      for (var i = 0; i < merged.length; i++) {
        var b = merged[i];
        if (fSection !== "all" && String(b.section) !== fSection) continue;
        if (fCategory !== "all" && String(b.category) !== fCategory) continue;
        if (fStatus !== "all" && String(b.status) !== fStatus) continue;
        if (q) {
          var hay = (b.id + " " + b.title + " " + b.section + " " + b.category).toLowerCase();
          if (hay.indexOf(q) === -1) continue;
        }
        out.push(b);
      }
      return out;
    },

    renderExpanded: function (b) {
      var id = String(b.id || "").trim();
      var iconExplicit = String(b.icon || "").trim();
      var stage = (this.state.iconStage && typeof this.state.iconStage[id] === "number") ? this.state.iconStage[id] : 0;

      var iconUrl = "";
      if (iconExplicit) {
        if (stage === 0) iconUrl = iconExplicit.replace(/\.png$/i, "_64.png");
        else if (stage === 1) iconUrl = iconExplicit;
        else iconUrl = "/assets/images/badges/_missing.png";
      } else {
        iconUrl = resolveIconFromId(id, stage);
      }

      var reqs = this._extractReqTexts(b);
      var isRetired = String(b.status) === "retired";
      var self = this;

      function bump() {
        var cur = (self.state.iconStage && typeof self.state.iconStage[id] === "number") ? self.state.iconStage[id] : 0;
        var next = Math.min(cur + 1, 2);
        var map = assign({}, self.state.iconStage);
        map[id] = next;
        self.setState({ iconStage: map });
      }

      return window.h(
        "div",
        { style: STYLES.expandWrap },
        window.h("div", { style: STYLES.expandGrid }, [
          window.h("div", { key: "id" }, [
            window.h("div", { style: STYLES.expandLabel }, "ID"),
            window.h("code", { style: STYLES.expandCode }, id || "—")
          ]),
          window.h("div", { key: "icon" }, [
            window.h("div", { style: STYLES.expandLabel }, "Icon"),
            window.h("img", { src: iconUrl, style: STYLES.iconPreview, onError: bump }),
            window.h("div", { style: STYLES.miniPath }, iconExplicit ? iconExplicit : ("/assets/images/badges/" + id + ".png (auto)"))
          ]),
          window.h("div", { key: "reqs", style: { gridColumn: "1 / -1" } }, [
            window.h("div", { style: STYLES.expandLabel }, "Requirements"),
            reqs.length
              ? window.h("ol", { style: STYLES.reqList }, reqs.map(function (t, i) { return window.h("li", { key: i, style: STYLES.reqItem }, t); }))
              : window.h("em", { style: STYLES.muted }, "No requirements")
          ]),
          window.h("div", { key: "actions", style: { gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" } }, [
            window.h("div", { style: STYLES.actions }, [
              window.h("button", { style: STYLES.btn, onClick: function (e) { e.preventDefault(); e.stopPropagation(); self.openEdit(b); } }, "Edit"),
              window.h("button", { style: STYLES.btn, onClick: function (e) { e.preventDefault(); e.stopPropagation(); self.setStatus(b, isRetired ? "active" : "retired"); } }, isRetired ? "Restore" : "Retire")
            ])
          ])
        ])
      );
    },

    renderRow: function (b) {
      var isRetired = String(b.status) === "retired";
      var isExpanded = this.state.expandedId === b.id;
      var self = this;

      var rowStyle = assign({}, STYLES.row, {
        background: isRetired ? "#fafbfc" : "#fff",
        opacity: isRetired ? 0.75 : 1,
        cursor: "pointer"
      });

      var row = window.h(
        "div",
        {
          key: "row-" + b.id,
          style: rowStyle,
          onClick: function () { self.toggleExpand(b.id); },
          role: "button",
          tabIndex: 0,
          onKeyDown: function (e) {
            if (e.key === "Enter" || e.key === " ") self.toggleExpand(b.id);
          }
        },
        window.h("div", { style: assign({}, STYLES.cell, STYLES.expanderCell), onClick: function (e) { e.preventDefault(); e.stopPropagation(); self.toggleExpand(b.id); } }, isExpanded ? "▾" : "▸"),
        window.h("div", { style: STYLES.cell, title: b.title }, b.title || "—"),
        window.h("div", { style: STYLES.cell }, b.section || "—"),
        window.h("div", { style: STYLES.cell }, b.category || "—"),
        window.h("div", { style: STYLES.cell }, b.status || "active")
      );

      return window.h("div", { key: b.id }, row, isExpanded ? this.renderExpanded(b) : null);
    },

    renderTableRows: function (items) {
      var rows = [];
      var bySection = {};
      for (var i = 0; i < items.length; i++) {
        var b = items[i];
        var s = String(b.section || "other");
        if (!bySection[s]) bySection[s] = [];
        bySection[s].push(b);
      }

      var sections = Object.keys(bySection).sort(function (a, b) { return a.localeCompare(b); });
      for (i = 0; i < sections.length; i++) {
        var sec = sections[i];
        if (this.state.groupBySection) rows.push(window.h("div", { key: "sec-" + sec, style: STYLES.sectionHeader }, sec));
        var list = bySection[sec] || [];
        for (var j = 0; j < list.length; j++) rows.push(this.renderRow(list[j]));
      }
      return rows;
    },

    renderModal: function () {
      var ed = this.state.editing;
      if (!ed) return null;
      var b = ed.badge;
      var self = this;

      function update(key, value) {
        var next = assign({}, b);
        next[key] = value;
        if (key === "title" && !ed.idTouched) next.id = slugifyId(value);
        self.setState({ editing: assign({}, ed, { badge: next }) });
      }

      function onIdChange(value) {
        var next = assign({}, b);
        next.id = slugifyId(value);
        self.setState({ editing: assign({}, ed, { idTouched: true, badge: next }) });
      }

      return window.h(
        "div",
        { style: STYLES.modalBackdrop, onClick: function () { self.closeEdit(); } },
        window.h(
          "div",
          { style: STYLES.modal, onClick: function (e) { e.stopPropagation(); } },
          window.h("div", { style: STYLES.modalHead }, [
            window.h("div", null, ed.mode === "new" ? "Add new badge" : ("Edit badge: " + b.id)),
            window.h("button", { style: STYLES.btn, onClick: function () { self.closeEdit(); } }, "Close")
          ]),
          window.h("div", { style: STYLES.modalBody }, [
            window.h("div", { style: assign({}, STYLES.field, { gridColumn: "1 / span 2" }) }, [
              window.h("div", { style: STYLES.label }, "Title"),
              window.h("input", { style: STYLES.input, value: b.title, onChange: function (e) { update("title", e.target.value); }, placeholder: "e.g. My new badge" })
            ]),
            window.h("div", { style: STYLES.field }, [
              window.h("div", { style: STYLES.label }, "Canonical ID"),
              window.h("input", { style: STYLES.input, value: b.id, onChange: function (e) { onIdChange(e.target.value); }, placeholder: "e.g. beavers-my-new-badge" }),
              window.h("div", { style: STYLES.hint }, "Lowercase, hyphenated. Don’t change after publishing.")
            ]),
            window.h("div", { style: STYLES.field }, [
              window.h("div", { style: STYLES.label }, "Status"),
              window.h("select", { style: STYLES.select, value: b.status, onChange: function (e) { update("status", e.target.value); } }, STATUS_OPTIONS.map(function (s) { return window.h("option", { key: s, value: s }, s); }))
            ]),
            window.h("div", { style: STYLES.field }, [
              window.h("div", { style: STYLES.label }, "Section"),
              window.h("select", { style: STYLES.select, value: b.section, onChange: function (e) { update("section", e.target.value); } }, SECTION_OPTIONS.map(function (s) { return window.h("option", { key: s, value: s }, s); }))
            ]),
            window.h("div", { style: STYLES.field }, [
              window.h("div", { style: STYLES.label }, "Category"),
              window.h("select", { style: STYLES.select, value: b.category, onChange: function (e) { update("category", e.target.value); } }, CATEGORY_OPTIONS.map(function (c) { return window.h("option", { key: c, value: c }, c); })),
              window.h("div", { style: STYLES.hint }, "Badge type is auto-set to " + badgeTypeFromCategory(b.category) + ".")
            ]),
            window.h("div", { style: assign({}, STYLES.field, { gridColumn: "1 / span 2" }) }, [
              window.h("div", { style: STYLES.label }, "Icon (optional)"),
              window.h("input", { style: STYLES.input, value: b.icon || "", onChange: function (e) { update("icon", e.target.value); }, placeholder: "/assets/images/badges/<id>.png" }),
              window.h("div", { style: STYLES.hint }, "Preview uses /assets/images/badges/<id>_64.png first, then full, then _missing.png."),
              window.h("div", { style: STYLES.hint }, [
                "This CMS backend cannot upload images from custom widgets. ",
                "Upload icons via the CMS Media area (or GitHub) into ",
                window.h("code", null, "assets/images/uploads"),
                ", then paste the uploaded path here (e.g. ",
                window.h("code", null, "/assets/images/uploads/my-file.png"),
                "). A GitHub Action will auto-copy/rename it to ",
                window.h("code", null, "/assets/images/badges/<id>.png"),
                " and generate ",
                window.h("code", null, "<id>_64.png"),
                " for you."
              ]),
              window.h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } }, [
                window.h("a", {
                  href: "#/media",
                  target: "_self",
                  style: assign({}, STYLES.btn, { textDecoration: "none", display: "inline-block" })
                }, "Open Media (upload icon)"),
                window.h("span", { style: STYLES.hint }, "Expected final: /assets/images/badges/<id>.png (+ <id>_64.png).")
              ])
            ]),
            window.h("div", { style: assign({}, STYLES.field, { gridColumn: "1 / span 2" }) }, [
              window.h("div", { style: STYLES.label }, "Requirements"),
              window.h(
                "div",
                { style: { display: "grid", gap: "8px" } },
                (Array.isArray(b.requirements) ? b.requirements : []).map(function (t, idx) {
                  return window.h("div", { key: idx, style: { display: "flex", gap: "8px", alignItems: "flex-start" } }, [
                    window.h("textarea", {
                      style: assign({}, STYLES.input, { minHeight: "60px", width: "100%" }),
                      value: t,
                      onChange: function (e) {
                        var next = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                        next[idx] = e.target.value;
                        update("requirements", next);
                      },
                      placeholder: "Requirement " + (idx + 1) + " text..."
                    }),
                    window.h("button", {
                      style: STYLES.btn,
                      onClick: function () {
                        var next2 = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                        next2.splice(idx, 1);
                        update("requirements", next2);
                      }
                    }, "Remove")
                  ]);
                })
              ),
              window.h("div", { style: { marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" } }, [
                window.h("button", { style: STYLES.btn, onClick: function () {
                  var next3 = (Array.isArray(b.requirements) ? b.requirements.slice() : []);
                  next3.push("");
                  update("requirements", next3);
                } }, "Add requirement"),
                window.h("button", { style: STYLES.btn, onClick: function () { update("requirements", []); } }, "Clear")
              ]),
              window.h("div", { style: STYLES.hint }, "Numbering is automatic. Just add one requirement per box.")
            ])
          ]),
          window.h("div", { style: STYLES.modalFoot }, [
            window.h("button", { style: STYLES.btn, onClick: function () { self.closeEdit(); } }, "Cancel"),
            window.h("button", { style: STYLES.btnPrimary, onClick: function () { self.saveEdit(); } }, "Save")
          ])
        )
      );
    },

    render: function () {
      var overrides = this.getOverrides();
      var filtered = this.getFilteredBadges();

      return window.h(
        "div",
        { style: STYLES.wrap },
        window.h("div", { style: STYLES.header }, [
          window.h("h2", { style: { margin: 0 } }, "Badges Manager"),
          window.h("div", { style: STYLES.subtitle }, "Add new badges and retire badges safely. Deletion is not supported. Retired badges will be pruned from mapping and activities by the site’s generation scripts/workflows.")
        ]),
        window.h("div", { style: STYLES.toolbar }, [
          window.h("input", { style: STYLES.input, value: this.state.q, onChange: function (e) { this.setState({ q: e.target.value }); }.bind(this), placeholder: "Search by ID, title, section…" }),
          window.h("select", { style: STYLES.select, value: this.state.filterSection, onChange: function (e) { this.setState({ filterSection: e.target.value }); }.bind(this) }, [window.h("option", { value: "all" }, "All sections")].concat(SECTION_OPTIONS.map(function (s) { return window.h("option", { key: s, value: s }, s); }))),
          window.h("select", { style: STYLES.select, value: this.state.filterCategory, onChange: function (e) { this.setState({ filterCategory: e.target.value }); }.bind(this) }, [window.h("option", { value: "all" }, "All categories")].concat(CATEGORY_OPTIONS.map(function (c) { return window.h("option", { key: c, value: c }, c); }))),
          window.h("select", { style: STYLES.select, value: this.state.filterStatus, onChange: function (e) { this.setState({ filterStatus: e.target.value }); }.bind(this) }, [window.h("option", { value: "all" }, "All statuses")].concat(STATUS_OPTIONS.map(function (s) { return window.h("option", { key: s, value: s }, s); }))),
          window.h("button", { style: STYLES.btn, onClick: function () { this.setState({ groupBySection: !this.state.groupBySection }); }.bind(this) }, this.state.groupBySection ? "Ungroup" : "Group by section"),
          window.h("button", { style: STYLES.btnPrimary, onClick: function () { this.openNew(); }.bind(this) }, "Add new badge"),
          window.h("span", { style: STYLES.pill }, "Overrides: " + overrides.length)
        ]),

        this.state.loading
          ? window.h("div", null, "Loading badges…")
          : window.h("div", { style: STYLES.table }, [
              window.h("div", { style: STYLES.row }, [
                window.h("div", { style: STYLES.headCell }, ""),
                window.h("div", { style: STYLES.headCell }, "Title"),
                window.h("div", { style: STYLES.headCell }, "Section"),
                window.h("div", { style: STYLES.headCell }, "Category"),
                window.h("div", { style: STYLES.headCell }, "Status")
              ])
            ].concat(this.renderTableRows(filtered))),

        this.state.error ? window.h("div", { style: STYLES.err }, this.state.error) : null,
        this.renderModal()
      );
    }
  });

  function register() {
    window.CMS.registerWidget("badges_manager", Control);
    try { console.log("[badges_manager] widget registered"); } catch (_) {}
  }

  if (ready()) register();
  else {
    var t = setInterval(function () {
      if (!ready()) return;
      clearInterval(t);
      register();
    }, 50);
  }
})();