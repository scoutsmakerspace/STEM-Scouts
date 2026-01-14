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
      if (!backend || typeof backend.persistMedia !== "function") {
        reject(new Error("CMS backend does not support media uploads from this widget."));
        return;
      }
      if (!file) {
        reject(new Error("No file selected."));
        return;
      }
      var safeId = String(badgeId || "").trim();
      if (!safeId) {
        reject(new Error("Badge ID is required for icon upload."));
        return;
      }

      // We cannot reliably rename the File object across browsers/Decap builds.
      // Upload as-is to the badges folder, then set icon path to canonical <id>.png.
      var folder = "assets/images/badges";
      try {
        if (backend && backend.config && backend.config.media_folder) folder = backend.config.media_folder;
      } catch (_) {}

      var opts = { path: folder };
      Promise.resolve(backend.persistMedia(file, opts))
        .then(function (res) {
          var url = "";
          if (res && typeof res === "object") {
            url = res.url || res.path || "";
            if (!url && res[0]) url = res[0].url || res[0].path || "";
          }
          // If backend returns a relative path, make it site-rooted
          if (url && url.charAt(0) !== "/") url = "/" + url;
          resolve(url || ("/assets/images/badges/" + safeId + ".png"));
        })
        .catch(function (err) {
          reject(err);
        });
    } catch (e) {
      reject(e);
    }
  });
}

function openMediaLibraryForIcon(onSelect) {
  try {
    if (window.CMS && typeof window.CMS.openMediaLibrary === "function") {
      // openMediaLibrary({ path, callback })
      window.CMS.openMediaLibrary({
        path: "assets/images/badges",
        callback: function (files) {
          try {
            if (!files || !files.length) return;
            // Decap can return a single file object or array
            var f = files[0] || files;
            onSelect(f);
          } catch (_) {}
        }
      });
      return true;
    }
  } catch (e) {}
  return false;
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
    okText: { fontSize: "12px", color: "#1a7f37", lineHeight: 1.3 },
    errText: { fontSize: "12px", color: "#cf222e", lineHeight: 1.3, whiteSpace: "pre-wrap" },
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
        uploadingIcon: false,
        localOverrides: null,
        iconSelectedName: "",
        iconUploadNote: "",
        iconUploadError: ""
      };
    },

    componentDidMount: function () {
      this.loadMaster();
      // Cache overrides locally so the table updates immediately after Save (Decap can delay props.value refresh)
      this.setState({ localOverrides: this.getOverrides() });
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
      if (this.state.localOverrides) return this.state.localOverrides;
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
      this.setState({ localOverrides: cleaned });
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
      this.setState({ iconSelectedName: "", iconUploadNote: "", iconUploadError: "", uploadingIcon: false,

        editing: {
          mode: "new",
          idTouched: false,
          badge: { id: "", title: "", section: "beavers", category: "Activity Badges", status: "active", icon: "", requirements: [] }
        }
      });
    },

    openEdit: function (badge) {
      this.setState({ iconSelectedName: "", iconUploadNote: "", iconUploadError: "", uploadingIcon: false,

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
              . For auto 64px generation, filename should be <id>.png in assets/images/badges."),
                window.h("div", { style: STYLES.okText }, (self.state.iconSelectedName ? ("Selected: " + self.state.iconSelectedName + ". ") : "") + (self.state.iconUploadNote || "")),
                (self.state.iconUploadError ? window.h("div", { style: STYLES.errText }, self.state.iconUploadError) : null),
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