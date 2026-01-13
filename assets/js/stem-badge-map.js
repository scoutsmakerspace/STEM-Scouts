(() => {
  const elSection = document.getElementById("stemSectionSelect");
  const elCategory = document.getElementById("stemCategorySelect");
  const elSearch = document.getElementById("stemSearchInput");
  const elIncludeBorderline = document.getElementById("stemIncludeBorderline");
  const elResults = document.getElementById("stemBadgeMapResults");

  if (!elSection || !elCategory || !elSearch || !elIncludeBorderline || !elResults) return;

  const baseUrl = String(window.siteBaseUrl || "").replace(/\/$/, "");
  const DATA = (window.STEM_BADGE_MAP_DATA && Array.isArray(window.STEM_BADGE_MAP_DATA.badges))
    ? window.STEM_BADGE_MAP_DATA.badges
    : [];

  // ---------- helpers ----------
  const escapeHtml = (s) => String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const norm = (s) => String(s ?? "").toLowerCase().trim();

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function setOptions(selectEl, options, allLabel) {
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = allLabel;
    selectEl.appendChild(optAll);
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      selectEl.appendChild(opt);
    });
  }

  function iconUrlsForBadgeId(badgeId) {
    const safe = encodeURIComponent(String(badgeId || ""));
    return {
      first: `${baseUrl}/assets/images/badges/${safe}_64.png`,
      second: `${baseUrl}/assets/images/badges/${safe}.png`,
      missing: `${baseUrl}/assets/images/badges/_missing.png`,
    };
  }

  function buildBadgeMeta(b) {
    // display section/category in the compact "beavers · Activity Badges" style if available
    const bits = [];
    if (b.section_slug) bits.push(b.section_slug);
    else if (b.section) bits.push(b.section);

    const cat = b.badge_type || b.category;
    if (cat) bits.push(cat);

    return bits.filter(Boolean).join(" · ");
  }

  function requirementPassesBorderline(r, includeBorderline) {
    if (includeBorderline) return true;
    return String(r?.strength || "").toLowerCase() !== "borderline";
  }

  // ---------- build controls ----------
  // sections: keep label pretty (use b.section if present) but value should be section_slug (stable)
  const sectionPairs = {};
  DATA.forEach((b) => {
    const key = b.section_slug || b.section || "";
    if (!key) return;
    sectionPairs[key] = b.section || b.section_slug || key;
  });
  const sectionOptions = uniqSorted(Object.keys(sectionPairs)).map((k) => ({ value: k, label: sectionPairs[k] }));

  setOptions(elSection, sectionOptions, "All sections");

  function updateCategoryOptions() {
    const selectedSection = elSection.value;
    const cats = [];
    DATA.forEach((b) => {
      const key = b.section_slug || b.section || "";
      if (selectedSection && key !== selectedSection) return;
      const c = b.category || b.badge_type || "";
      if (c) cats.push(c);
    });
    const catOptions = uniqSorted(cats).map((c) => ({ value: c, label: c }));
    const current = elCategory.value;
    setOptions(elCategory, catOptions, "All categories");
    // try to preserve selection
    if (current && catOptions.some((o) => o.value === current)) elCategory.value = current;
  }

  // ---------- render ----------
  function render() {
    const selectedSection = elSection.value;
    const selectedCategory = elCategory.value;
    const q = norm(elSearch.value);
    const includeBorderline = !!elIncludeBorderline.checked;

    const out = [];

    DATA.forEach((b) => {
      const sectionKey = b.section_slug || b.section || "";
      if (selectedSection && sectionKey !== selectedSection) return;

      const cat = b.category || b.badge_type || "";
      if (selectedCategory && cat !== selectedCategory) return;

      const reqsAll = Array.isArray(b.stem_requirements) ? b.stem_requirements : [];
      const reqs = reqsAll.filter((r) => requirementPassesBorderline(r, includeBorderline));

      if (!reqs.length) return;

      // Search filter: badge title OR any requirement text/why/prompt
      if (q) {
        const hitBadge = norm(b.title).includes(q);
        const hitReq = reqs.some((r) => {
          const t = norm(r.text);
          const why = norm(r.why_stem);
          const prompts = Array.isArray(r.leader_prompts) ? norm(r.leader_prompts.join(" ")) : "";
          return t.includes(q) || why.includes(q) || prompts.includes(q) || norm(r.ref).includes(q);
        });
        if (!hitBadge && !hitReq) return;
      }

      const badgeId = b.badge_id || b.id || "";
      const urls = iconUrlsForBadgeId(badgeId);

      const meta = buildBadgeMeta(b);
      const metaHtml = meta ? `<span class="stem-badge-map__badge-meta">${escapeHtml(meta)}</span>` : "";

      const reqHtml = reqs.map((r) => {
        const strength = String(r.strength || "").toLowerCase();
        const strengthTag = strength
          ? `<span class="stem-req__strength stem-req__strength--${escapeHtml(strength)}">${escapeHtml(strength)}</span>`
          : "";

        const areas = Array.isArray(r.areas) && r.areas.length
          ? `<div class="stem-req__areas">${r.areas.map(escapeHtml).join(", ")}</div>`
          : "";

        const prompts = Array.isArray(r.leader_prompts) ? r.leader_prompts.filter(Boolean) : [];
        const promptHtml = prompts.length
          ? `<details><summary>Leader prompts</summary><div class="stem-prompts-lines">${prompts
              .map((p) => `<div class="stem-prompt-line">${escapeHtml(p)}</div>`)
              .join("")}</div></details>`
          : "";

        const why = String(r.why_stem || "").replace(/\n/g, "<br>");

        return `
          <div class="stem-req">
            <div class="stem-req__header">
              <span class="stem-req__ref">${escapeHtml(r.ref)}.</span>
              <span class="stem-req__text">${escapeHtml(r.text)}</span>
              ${strengthTag}
            </div>
            ${areas}
            <p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(why)}</p>
            <div class="stem-req__prompt">${promptHtml}</div>
          </div>
        `;
      }).join("");

      out.push(`
        <details class="stem-badge-map__badge">
          <summary>
            <img class="stem-badge-map__badge-icon"
                 src="${urls.first}"
                 data-src2="${urls.second}"
                 data-missing="${urls.missing}"
                 alt="${escapeHtml(b.title)} badge icon"
                 onerror="if(!this.dataset.tried2){this.dataset.tried2='1';this.src=this.dataset.src2;}else{this.onerror=null;this.src=this.dataset.missing;}" />
            <span class="stem-badge-map__badge-title">${escapeHtml(b.title)}</span>
            ${metaHtml}
            <span class="stem-badge-map__counts">
              <span class="stem-badge-map__count">${reqs.length} requirement${reqs.length === 1 ? "" : "s"}</span>
            </span>
          </summary>
          <div class="stem-badge-map__reqs">
            ${reqHtml}
          </div>
        </details>
      `);
    });

    elResults.innerHTML = out.length ? out.join("") : "<p><em>No matches.</em></p>";
  }

  // wire up
  updateCategoryOptions();
  render();

  elSection.addEventListener("change", () => {
    updateCategoryOptions();
    render();
  });
  elCategory.addEventListener("change", render);
  elIncludeBorderline.addEventListener("change", render);
  elSearch.addEventListener("input", () => {
    // simple debounce
    window.clearTimeout(render._t);
    render._t = window.setTimeout(render, 120);
  });
})();