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

  const norm = (s) => String(s || "").toLowerCase();
  const badgeIconUrl = (id) => `/assets/images/badges/${encodeURIComponent(String(id || "").trim())}.png`;
  const badgeIconImg = (id, alt) => {
    const src = badgeIconUrl(id);
    const a = escapeHtml(alt || "");
    return `<img class="stem-badge-icon" src="${src}" alt="${a}" width="32" height="32" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/badges/_missing.png\';" />`;
  };


  const data =
    window.STEM_BADGE_MAP_DATA && Array.isArray(window.STEM_BADGE_MAP_DATA.badges)
      ? window.STEM_BADGE_MAP_DATA
      : { badges: [] };

  const badges = data.badges;

  // ----------------------------
  // Activities index: badge_id -> [{title,url}]
  // ----------------------------
  let activitiesByBadgeId = new Map();
  let activitiesLoaded = false;

  function buildActivitiesIndex(items) {
    const map = new Map();
    (items || []).forEach((a) => {
      const ids = Array.isArray(a.badge_ids) ? a.badge_ids : [];
      ids.forEach((raw) => {
        const id = String(raw || "").trim();
        if (!id) return;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ title: a.title || "Activity", url: a.url || "#" });
      });
    });

    for (const [k, arr] of map.entries()) {
      arr.sort((x, y) => String(x.title || "").localeCompare(String(y.title || "")));
      map.set(k, arr);
    }
    return map;
  }

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
      // IMPORTANT: badge page is /STEM-Scouts/badges/ so "assets/..." is wrong.
      // Try multiple base-safe paths and use the first that works.
      const candidates = [
        new URL("../assets/data/activities_index.json", window.location.href).toString(),
        new URL("./assets/data/activities_index.json", window.location.href).toString(),
        new URL("assets/data/activities_index.json", window.location.href).toString(),
        // last resort: root-relative (works if no baseurl, harmless if it 404s)
        new URL("/assets/data/activities_index.json", window.location.origin).toString(),
      ];

      const { url, json } = await fetchFirstOkJson(candidates);

      activitiesByBadgeId = buildActivitiesIndex(Array.isArray(json) ? json : []);
      activitiesLoaded = true;

      console.log("[stem-badge-map] activities loaded from:", url, "badgeIds:", activitiesByBadgeId.size);
    } catch (e) {
      console.warn("[stem-badge-map] activities index load failed:", e);
      activitiesByBadgeId = new Map();
      activitiesLoaded = true; // still render, just with 0 activities
    }
  }

  function getBadgeKey(b) {
    // Your mapping data usually has badge_id. Some builds may use id.
    if (b && b.badge_id) return String(b.badge_id).trim();
    if (b && b.id) return String(b.id).trim();
    return "";
  }

  function getActivityListForBadge(badge) {
    const key = getBadgeKey(badge);
    if (!key) return [];
    return activitiesByBadgeId.get(key) || [];
  }

  // ----------------------------
  // Filters
  // ----------------------------
  function buildSections(items) {
    const set = new Set(items.map((b) => b.section).filter(Boolean));
    const sections = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All", ...sections];
  }

  function buildCategories(items) {
    const set = new Set(items.map((b) => b.category).filter(Boolean));
    const cats = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All", ...cats];
  }

  function populateSelect(el, values) {
    el.innerHTML = "";
    for (const v of values) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    }
  }

  function requirementMatches(req, q) {
    if (!q) return true;
    return (
      norm(req.text).includes(q) ||
      norm(req.why_stem).includes(q) ||
      norm((req.areas || []).join(" ")).includes(q) ||
      norm(req.ref).includes(q)
    );
  }

  function badgeMatches(badge, q) {
    if (!q) return true;
    if (norm(badge.title).includes(q)) return true;
    return (badge.stem_requirements || []).some((r) => requirementMatches(r, q));
  }

  function renderBadges(items, q, section, category, includeBorderline) {
    const qn = norm(q).trim();

    const out = items
      .filter((b) => (section === "All" ? true : b.section === section))
      .filter((b) => (category === "All" ? true : b.category === category))
      .filter((b) => badgeMatches(b, qn))
      .map((b) => {
        const reqsAll = Array.isArray(b.stem_requirements) ? b.stem_requirements : [];
        const reqs = reqsAll
          .filter((r) => (includeBorderline ? true : r.strength !== "borderline"))
          .filter((r) => requirementMatches(r, qn));

        if (reqs.length === 0) return null;

        const acts = activitiesLoaded ? getActivityListForBadge(b) : [];
        const actCount = acts.length;

        const activitiesPill =
          activitiesLoaded && actCount > 0
            ? `<span class="stem-badge-map__actcount">${actCount} activit${
                actCount === 1 ? "y" : "ies"
              }</span>`
            : "";

        const activitiesBlock =
          activitiesLoaded && actCount > 0
            ? `
              <div class="stem-badge-map__activities">
                <div class="stem-badge-map__activities-title">Used in activities</div>
                <div class="stem-badge-map__activities-links">
                  ${acts
                    .map((a) => {
                      const t = escapeHtml(a.title || "Activity");
                      const u = escapeHtml(a.url || "#");
                      return `<a class="stem-badge-map__activity-link" href="${u}">${t}</a>`;
                    })
                    .join("")}
                </div>
              </div>
            `
            : "";

        const reqHtml = reqs
          .map((r) => {
            const strengthTag =
              r.strength === "borderline"
                ? '<span class="stem-tag stem-tag--borderline">Borderline</span>'
                : '<span class="stem-tag stem-tag--strong">Strong</span>';

            const areas = (r.areas || []).map((a) => `<span class="stem-tag">${escapeHtml(a)}</span>`).join("");

            const prompts = Array.isArray(r.leader_prompts) ? r.leader_prompts : [];
            const promptHtml =
              prompts.length > 0
                ? `<details><summary>Leader prompts</summary><div class="stem-prompts-lines">${prompts
                    .map((p) => `<div class="stem-prompt-line">${escapeHtml(p)}</div>`)
                    .join("")}</div></details>`
                : "";

            return `
              <div class="stem-req">
                <div class="stem-req__header">
                  <span class="stem-req__ref">${escapeHtml(r.ref)}.</span>
                  <span class="stem-req__text">${escapeHtml(r.text)}</span>
                  ${strengthTag}
                </div>
                <div class="stem-req__areas">${areas}</div>
                <p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(r.why_stem || "").replace(/\n/g, "<br>")}</p>
                <div class="stem-req__prompt">${promptHtml}</div>
              </div>
            `;
          })
          .join("");

        const metaBits = [b.section, b.category].filter(Boolean).map(escapeHtml).join(" · ");

        return `
          <details>
            <summary>
              <span class="stem-badge-map__badge-title">${badgeIconImg(b.id, b.title)}<span class="stem-badge-icon__title">${escapeHtml(b.title)}</span></span>
              <span class="stem-badge-map__badge-meta">${metaBits}</span>
              <span class="stem-badge-map__counts">
                <span class="stem-badge-map__count">${reqs.length} requirement${reqs.length === 1 ? "" : "s"}</span>
                ${activitiesPill}
              </span>
            </summary>
            ${activitiesBlock}
            ${reqHtml}
          </details>
        `;
      })
      .filter(Boolean);

    elResults.innerHTML = out.length ? out.join("") : "<p><em>No matches.</em></p>";
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  populateSelect(elSection, buildSections(badges));
  populateSelect(elCategory, buildCategories(badges));

  const rerender = () =>
    renderBadges(badges, elSearch.value, elSection.value, elCategory.value, !!elBorderline.checked);

  const rerenderDebounced = debounce(rerender, 120);

  elSearch.addEventListener("input", rerenderDebounced);
  elSection.addEventListener("change", rerender);
  elCategory.addEventListener("change", rerender);
  elBorderline.addEventListener("change", rerender);

  // Render immediately, then load activities and render again
  rerender();
  loadActivitiesIndex().then(rerender);
})();