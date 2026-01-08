(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // ---------- Load badges master (cached) ----------
  let _idx = null;
  let _loading = null;

  async function loadBadgesIndex() {
    if (_idx) return _idx;
    if (_loading) return _loading;

    _loading = fetch("./badges_master.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`badges_master.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const arr = Array.isArray(json) ? json : (Array.isArray(json.badges) ? json.badges : []);
        const idx = {};
        for (const b of arr) if (b && b.id) idx[b.id] = b;
        _idx = idx;
        console.log("[badge_requirements] loaded badges:", Object.keys(_idx).length);
        return _idx;
      })
      .catch((e) => {
        console.error("[badge_requirements] load failed:", e);
        _idx = {};
        return _idx;
      });

    return _loading;
  }

  // ---------- DOM helpers ----------
  function closest(el, pred, maxUp = 20) {
    let cur = el;
    for (let i = 0; i < maxUp && cur; i++) {
      if (pred(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function findBadgeValueNearRequirements(forID, badgeFieldName = "badge") {
    // Find the requirements control element by id
    const reqEl = forID ? document.getElementById(forID) : null;
    if (!reqEl) return null;

    // Find the enclosing list-item-ish container
    // Decap list items usually have some wrapper; we use a generic heuristic:
    const item = closest(
      reqEl,
      (node) => {
        // A "list item" wrapper tends to contain multiple labeled fields.
        // We'll accept a container that has at least 2 labels.
        const labels = node.querySelectorAll ? node.querySelectorAll("label") : [];
        return labels && labels.length >= 2;
      },
      30
    ) || reqEl.parentElement;

    if (!item || !item.querySelectorAll) return null;

    // Look for a hidden/input field that corresponds to the badge relation field.
    // In Decap, relation widgets usually keep an <input> with the value_field.
    // We search inputs/selects where name/id contains the badge field name.
    const candidates = Array.from(item.querySelectorAll("input, select, textarea"));

    // First pass: hidden inputs (most likely to hold the actual ID)
    for (const el of candidates) {
      const type = (el.getAttribute("type") || "").toLowerCase();
      const name = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();

      if (type === "hidden" && (name.includes(badgeFieldName) || id.includes(badgeFieldName))) {
        const v = (el.value || "").trim();
        if (v) return v;
      }
    }

    // Second pass: any input/select with name/id containing badge
    for (const el of candidates) {
      const name = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();
      if (name.includes(badgeFieldName) || id.includes(badgeFieldName)) {
        const v = (el.value || "").trim();
        if (v) return v;
      }
    }

    return null;
  }

  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return { loading: true, badgeId: null, reqs: [], _timer: null };
      },

      async componentDidMount() {
        await this.refresh(true);

        // Poll briefly because relation widget updates asynchronously
        const t = setInterval(() => this.refresh(false), 400);
        this.setState({ _timer: t });
      },

      componentWillUnmount() {
        if (this.state._timer) clearInterval(this.state._timer);
      },

      async refresh(firstTime) {
        const badgeField = (this.props.field && this.props.field.get && this.props.field.get("badge_field")) || "badge";

        // IMPORTANT: in your setup props.path/id are undefined, but props.forID exists
        const badgeId = findBadgeValueNearRequirements(this.props.forID, badgeField);

        // Only do the heavy work if badge changed or first time
        if (!firstTime && badgeId === this.state.badgeId) return;

        const idx = await loadBadgesIndex();
        const badge = badgeId ? idx[badgeId] : null;

        console.log("[badge_requirements] forID:", this.props.forID, "badgeId:", badgeId, "found:", !!badge);

        const reqs = badge && Array.isArray(badge.requirements) ? badge.requirements : [];

        // Store selected requirement ids as strings ("1", "2", "1.3"...)
        const current = Array.isArray(this.props.value) ? this.props.value.map(String) : [];
        const allowed = new Set(reqs.map((r) => String(r.id)));
        const cleaned = current.filter((v) => allowed.has(String(v)));

        if (JSON.stringify(cleaned) !== JSON.stringify(current)) {
          this.props.onChange(cleaned);
        }

        this.setState({ loading: false, badgeId: badgeId || null, reqs });
      },

      toggle(reqId) {
        const id = String(reqId);
        const v = Array.isArray(this.props.value) ? this.props.value.map(String) : [];
        const i = v.indexOf(id);
        if (i >= 0) v.splice(i, 1);
        else v.push(id);

        v.sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b);
          if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
          return a.localeCompare(b);
        });

        this.props.onChange(v);
      },

      render() {
        const value = Array.isArray(this.props.value) ? this.props.value.map(String) : [];

        if (this.state.loading) {
          return h("div", { className: this.props.classNameWrapper }, "Loading requirements…");
        }

        if (!this.state.badgeId) {
          return h(
            "div",
            { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "Pick a badge first to see its requirements."
          );
        }

        if (!this.state.reqs.length) {
          return h(
            "div",
            { className: this.props.classNameWrapper, style: { opacity: 0.85 } },
            "No numbered requirements found for this badge."
          );
        }

        return h(
          "div",
          { className: this.props.classNameWrapper },
          h("div", { style: { marginBottom: "0.5rem", opacity: 0.85 } }, "Tick the requirements this activity supports:"),
          h(
            "div",
            {
              style: {
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                padding: "0.5rem 0.75rem",
                maxHeight: 320,
                overflow: "auto",
              },
            },
            this.state.reqs.map((r) =>
              h(
                "label",
                {
                  key: String(r.id),
                  style: { display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.35rem 0" },
                },
                h("input", {
                  type: "checkbox",
                  checked: value.includes(String(r.id)),
                  onChange: () => this.toggle(r.id),
                  style: { marginTop: 3 },
                }),
                h("div", null,
                  h("div", { style: { fontWeight: 600 } }, `${r.id}.`),
                  h("div", null, r.text)
                )
              )
            )
          )
        );
      },
    });

    const Preview = createClass({
      render() {
        const v = Array.isArray(this.props.value) ? this.props.value : [];
        return h("div", null, v.length ? `Selected: ${v.join(", ")}` : "No requirements selected");
      },
    });

    CMS.registerWidget("badge_requirements", Control, Preview);
    console.log("[badge_requirements] widget registered");
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    if (register() || tries > 120) clearInterval(t);
  }, 100);
})();
