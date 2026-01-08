(function () {
  function ready() {
    return window.CMS && window.createClass && window.h;
  }

  // -------------------------
  // Load badge master JSON (cached)
  // -------------------------
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

  // Convert "badge_links.0.requirements_met" or "data.badge_links[0].requirements_met"
  // into ["badge_links", 0, "requirements_met"] etc.
  function pathToArray(pathStr) {
    const s = String(pathStr || "");
    const normalized = s.replace(/\[(\d+)\]/g, ".$1");
    return normalized
      .split(".")
      .filter(Boolean)
      .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p));
  }

  function getInSafe(obj, arr) {
    try {
      return obj && obj.getIn ? obj.getIn(arr) : null;
    } catch {
      return null;
    }
  }

  function readBadgeId(props) {
    const badgeField = (props.field && props.field.get && props.field.get("badge_field")) || "badge";

    // Decap 3.10: props.path is undefined in your environment.
    // forID/id reliably exists and contains the field "path".
    const pathStr = props.path || props.forID || props.id || "";
    const pathArr = pathToArray(pathStr);

    if (!pathArr.length) return null;

    // sibling path: same parent, last segment -> badgeField
    const sibling = pathArr.slice(0, -1).concat([badgeField]);

    // Try live editor state (with and without "data" root)
    const fm = props.fieldsMetaData;

    const live1 = getInSafe(fm, sibling);
    if (live1) return String(live1);

    const siblingWithData = sibling[0] === "data" ? sibling : ["data"].concat(sibling);
    const live2 = getInSafe(fm, siblingWithData);
    if (live2) return String(live2);

    // Saved entry fallback (always under entry.data)
    const entryPath = sibling[0] === "data" ? sibling : ["data"].concat(sibling);
    const saved = getInSafe(props.entry, entryPath);
    if (saved) return String(saved);

    return null;
  }

  function register() {
    if (!ready()) return false;

    const { CMS, createClass, h } = window;

    const Control = createClass({
      getInitialState() {
        return { loading: true, badgeId: null, reqs: [], debugOnce: false };
      },

      async componentDidMount() {
        await this.refresh();
      },

      async componentDidUpdate(prevProps) {
        const prev = readBadgeId(prevProps);
        const curr = readBadgeId(this.props);
        if (prev !== curr) await this.refresh();
      },

      async refresh() {
        this.setState({ loading: true });

        const badgeId = readBadgeId(this.props);
        const idx = await loadBadgesIndex();
        const badge = badgeId ? idx[badgeId] : null;

        if (!this.state.debugOnce) {
          console.log("[badge_requirements] debug forID:", this.props.forID);
          console.log("[badge_requirements] debug id:", this.props.id);
          console.log("[badge_requirements] debug path:", this.props.path);
          this.setState({ debugOnce: true });
        }

        console.log("[badge_requirements] badgeId:", badgeId, "found:", !!badge);

        const reqs = badge && Array.isArray(badge.requirements) ? badge.requirements : [];

        // Store selected requirement IDs as strings
        const current = Array.isArray(this.props.value) ? this.props.value.map(String) : [];
        const allowed = new Set(reqs.map((r) => String(r.id)));

        const cleaned = current.filter((v) => allowed.has(String(v)));
        if (JSON.stringify(cleaned) !== JSON.stringify(current)) {
          this.props.onChange(cleaned);
        }

        this.setState({ loading: false, badgeId, reqs });
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
