(() => {
  const elSection = document.getElementById("stemSectionSelect");
  const elCategory = document.getElementById("stemCategorySelect");
  const elSearch = document.getElementById("stemSearchInput");
  const elBorderline = document.getElementById("stemIncludeBorderline");
  const elResults = document.getElementById("stemBadgeMapResults");

  if (!elSection || !elCategory || !elSearch || !elBorderline || !elResults) return;

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const norm = (s) => String(s ?? "").toLowerCase();

  const data =
    window.STEM_BADGE_MAP_DATA && Array.isArray(window.STEM_BADGE_MAP_DATA.badges)
      ? window.STEM_BADGE_MAP_DATA
      : { badges: [] };

  let badges = Array.isArray(data.badges) ? data.badges : [];

  // badge_id -> { title, url, ... }
  let activitiesByBadgeId = new Map();

  // badge_id -> icon_url
  let iconMap = new Map();

  async function fetchFirstOkJson(urls) {
    let lastErr = null;
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        return { url: u, json: j };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No URL worked");
  }

  async function loadActivitiesIndex() {
    try {
      // badge page is /<baseurl>/badges/ so relative paths can be tricky
      const candidates = [
        new URL("../assets/data/activities_index.json", window.location.href).toString(),
        new URL("./assets/data/activities_index.json", window.location.href).toString(),
        new URL("assets/data/activities_index.json", window.location.href).toString(),
        new URL((window.siteBaseUrl || "") + "/assets/data/activities_index.json", window.location.origin).toString(),
        new URL("/assets/data/activities_index.json", window.location.origin).toString(),
      ];
      const { json } = await fetchFirstOkJson(candidates);
      if (!Array.isArray(json)) return;

      const map = new Map();
      for (const a of json) {
        const title = a?.title;
        const url = a?.url;
        const badgeIds = Array.isArray(a?.badge_ids) ? a.badge_ids : [];
        for (const bid of badgeIds) {
          if (!bid) continue;
          const key = String(bid);
          const arr = map.get(key) || [];
          arr.push({ title, url });
          map.set(key, arr);
        }
      }
      activitiesByBadgeId = map;
    } catch (e) {
      console.warn("[stem-badge-map] activities index failed to load", e);
    }
  }

  async function loadBadgesMaster() {
    try {
      const candidates = [
        new URL("../admin/badges_master.json", window.location.href).toString(),
        new URL("./admin/badges_master.json", window.location.href).toString(),
        new URL("admin/badges_master.json", window.location.href).toString(),
        new URL((window.siteBaseUrl || "") + "/admin/badges_master.json", window.location.origin).toString(),
        new URL("/admin/badges_master.json", window.location.origin).toString(),
      ];
      const { json } = await fetchFirstOkJson(candidates);
      const arr = Array.isArray(json) ? json : (json && Array.isArray(json.badges) ? json.badges : []);
      const ids = new Set(arr.map((b) => String(b?.id ?? "")));
      iconMap = new Map(
        arr
          .filter((b) => b && b.id)
          .map((b) => [String(b.id), String(b.icon_url || "")])
      );

      // Filter the mapping list so “no keep” or removed badges don’t show
      badges = badges.filter((b) => ids.has(String(b?.badge_id || b?.id || "")));
    } catch (e) {
      console.warn("[stem-badge-map] badges_master failed to load (no filtering)", e);
    }
  }

  function buildOptions() {
    const sections = new Set(["All"]);
    const categories = new Set(["All"]);

    for (const b of badges) {
      if (b?.section) sections.add(b.section);
      if (b?.category) categories.add(b.category);
    }

    const setOpts = (el, values) => {
      const cur = el.value;
      el.innerHTML = "";
      for (const v of Array.from(values).sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)))) {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
      if (Array.from(values).includes(cur)) el.value = cur;
    };

    setOpts(elSection, sections);
    setOpts(elCategory, categories);
  }

  function renderBadges() {
    const q = norm(elSearch.value).trim();
    const sec = elSection.value;
    const cat = elCategory.value;
    const includeBorderline = !!elBorderline.checked;

    const filtered = badges
      .filter((b) => {
        if (!includeBorderline && b?.borderline === true) return false;
        if (sec && sec !== "All" && b?.section !== sec) return false;
        if (cat && cat !== "All" && b?.category !== cat) return false;

        if (!q) return true;

        const hay = [
          b?.title,
          b?.badge_name,
          b?.section,
          b?.category,
          ...(Array.isArray(b?.requirements) ? b.requirements.map((r) => `${r?.ref || ""} ${r?.text || ""} ${r?.why_stem || ""}`) : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));

    const out = filtered.map((b) => {
      const badgeId = String(b?.badge_id || b?.id || "");
      if (!badgeId) return "";

      const iconUrl = iconMap.get(badgeId) || `/assets/images/badges/${encodeURIComponent(badgeId)}.png`;

      const metaBits = [b?.section, b?.category].filter(Boolean).join(" · ");

      const reqs = Array.isArray(b?.requirements) ? b.requirements : [];
      const activities = activitiesByBadgeId.get(badgeId) || [];

      const activitiesPill = activities.length
        ? `<span class="stem-badge-map__count">${activities.length} activity${activities.length === 1 ? "" : "ies"}</span>`
        : "";

      const activitiesBlock = activities.length
        ? `<div class="stem-badge-map__activities"><div class="stem-badge-map__activities-title">Used in activities</div><ul>${activities
            .map((a) => `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.title)}</a></li>`)
            .join("")}</ul></div>`
        : "";

      const reqHtml = reqs
        .map((r) => {
          const areas = Array.isArray(r?.stem_areas) ? r.stem_areas : [];
          const strength = r?.strength ? String(r.strength) : "";
          const strengthTag = strength ? `<span class="stem-req__tag">${escapeHtml(strength)}</span>` : "";
          const prompts = Array.isArray(r?.prompts) ? r.prompts : [];
          const promptsHtml = prompts.length
            ? `<details class="stem-req__prompts"><summary>Leader prompts</summary><div class="stem-prompts-lines">${prompts
                .map((p) => `<div class="stem-prompt-line">${escapeHtml(p)}</div>`)
                .join("")}</div></details>`
            : "";

          return `
            <div class="stem-req">
              <div class="stem-req__header">
                <span class="stem-req__ref">${escapeHtml(r?.ref || "")}.</span>
                <span class="stem-req__text">${escapeHtml(r?.text || "")}</span>
                ${strengthTag}
              </div>
              <div class="stem-req__areas">${areas.map((a) => `<span class="stem-req__chip">${escapeHtml(a)}</span>`).join("")}</div>
              <p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(r?.why_stem || "").replace(/\n/g, "<br>")}</p>
              ${promptsHtml}
            </div>
          `;
        })
        .join("");

      return `
        <details class="stem-badge-map__badge">
          <summary>
            <img class="stem-badge-map__badge-icon" src="${escapeHtml(iconUrl)}" alt="" loading="lazy"
              onerror="this.onerror=null;this.src='/assets/images/badges/_missing.png';" />
            <span class="stem-badge-map__badge-title">${escapeHtml(b?.title || b?.badge_name || badgeId)}</span>
            <span class="stem-badge-map__badge-meta">${escapeHtml(metaBits)}</span>
            <span class="stem-badge-map__counts">
              <span class="stem-badge-map__count">${reqs.length} requirement${reqs.length === 1 ? "" : "s"}</span>
              ${activitiesPill}
            </span>
          </summary>
          ${activitiesBlock}
          <div class="stem-badge-map__reqs">${reqHtml}</div>
        </details>
      `;
    });

    elResults.innerHTML = out.filter(Boolean).length ? out.join("") : "<p><em>No matches.</em></p>";
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  // Make <details> toggling reliable even inside CMS if an overlay steals default behaviour
  elResults.addEventListener("click", (e) => {
    const summary = e.target.closest("summary");
    if (!summary) return;
    const details = summary.closest("details");
    if (!details) return;

    // Allow links inside expanded content to work normally
    if (e.target.closest("a")) return;

    e.preventDefault();
    details.open = !details.open;
  });

  const rerenderDebounced = debounce(renderBadges, 120);

  elSearch.addEventListener("input", rerenderDebounced);
  elSection.addEventListener("change", renderBadges);
  elCategory.addEventListener("change", renderBadges);
  elBorderline.addEventListener("change", renderBadges);

  // Initial render without indexes, then load indexes and re-render
  buildOptions();
  renderBadges();

  Promise.all([loadBadgesMaster(), loadActivitiesIndex()]).then(() => {
    buildOptions();
    renderBadges();
  });
})();