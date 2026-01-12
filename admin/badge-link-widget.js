(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  let _badges = null;
  let _loading = null;

  async function loadBadges() {
    if (_badges) return _badges;
    if (_loading) return _loading;

    const url = (window.location.origin || "") + "/assets/data/badges_master.json";
    _loading = fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        _badges = Array.isArray(json) ? json : (json && Array.isArray(json.badges) ? json.badges : []);
        return _badges;
      })
      .catch((e) => {
        console.warn("[badge_link] failed to load badges:", e);
        _badges = [];
        return _badges;
      });

    return _loading;
  }

  const Control = window.createClass({
    getInitialState() {
      return { q: "", badges: null };
    },

    componentDidMount() {
      loadBadges().then((b) => this.setState({ badges: b }));
    },

    onBadgeChange(e) {
      const badge_id = e.target.value || "";
      const cur = this.props.value || {};
      this.props.onChange({ ...cur, badge_id });
    },

    onReqChange(e) {
      const cur = this.props.value || {};
      const raw = e.target.value || "";
      const requirements_met = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      this.props.onChange({ ...cur, requirements_met });
    },

    onNotesChange(e) {
      const cur = this.props.value || {};
      this.props.onChange({ ...cur, notes: e.target.value || "" });
    },

    render() {
      const value = this.props.value || {};
      const badge_id = value.badge_id || "";
      const reqs = Array.isArray(value.requirements_met) ? value.requirements_met : [];
      const notes = value.notes || "";

      const badges = Array.isArray(this.state.badges) ? this.state.badges : [];
      const sorted = badges
        .map((b) => ({
          id: b.id,
          name: b.badge_name || b.title || b.id,
          section: b.section || "",
          category: b.category || "",
        }))
        .sort((a, b) => (a.section || "").localeCompare(b.section || "") || (a.name || "").localeCompare(b.name || ""));

      return window.h(
        "div",
        { className: "blw" },
        window.h("label", { className: "blw-label" }, "Badge"),
        window.h(
          "select",
          { value: badge_id, onChange: this.onBadgeChange, className: "blw-select" },
          [window.h("option", { value: "" }, "— Select —")].concat(
            sorted.map((b) =>
              window.h("option", { key: b.id, value: b.id }, `${b.section} — ${b.name} (${b.category})`)
            )
          )
        ),
        window.h("label", { className: "blw-label" }, "Requirements met (comma-separated refs)"),
        window.h("input", {
          type: "text",
          value: reqs.join(", "),
          onChange: this.onReqChange,
          className: "blw-input",
          placeholder: "e.g. 1, 3a, 7",
        }),
        window.h("label", { className: "blw-label" }, "Notes (optional)"),
        window.h("input", {
          type: "text",
          value: notes,
          onChange: this.onNotesChange,
          className: "blw-input",
          placeholder: "",
        })
      );
    },
  });

  const Preview = window.createClass({
    render() {
      const v = this.props.value || {};
      if (!v.badge_id) return window.h("span", { style: { color: "#6b7280" } }, "No badge linked.");
      return window.h("span", null, `${v.badge_id}${Array.isArray(v.requirements_met) && v.requirements_met.length ? " (" + v.requirements_met.join(", ") + ")" : ""}`);
    },
  });

  function register() {
    window.CMS.registerWidget("badge_link", Control, Preview);
    console.log("[badge_link] widget registered");
  }

  function tick() {
    if (ready()) return register();
    setTimeout(tick, 50);
  }

  (function injectCss() {
    const css = `
      .blw { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .blw-label { display:block; margin:.5rem 0 .25rem; font-weight:600; }
      .blw-select, .blw-input { width:100%; max-width:720px; padding:.55rem .7rem; border:1px solid #e5e7eb; border-radius:10px; }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  })();

  tick();
})();