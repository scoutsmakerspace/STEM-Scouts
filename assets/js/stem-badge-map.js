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
    const bits = [];
    if (b.section) bits.push(b.section);
    else if (b.section_slug) bits.push(b.section_slug);
    const cat = b.badge_type || b.category;
    if (cat) bits.push(cat);
    return bits.filter(Boolean).join(" · ");
  }

  function normaliseRelevance(r) {
    const rel = norm(r?.stem_relevance || r?.strength);
    if (rel === "direct" || rel === "strong") return "direct";
    if (rel === "framed" || rel === "borderline" || rel === "medium" || rel === "light") return "framed";
    return "framed";
  }

  function requirementPassesFramedToggle(r, includeFramed) {
    if (includeFramed) return true;
    return normaliseRelevance(r) === "direct";
  }

  function relevanceLabel(rel) {
    return rel === "direct" ? "Direct STEM" : "STEM through framing";
  }

  function listHtml(items, cls) {
    const arr = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!arr.length) return "";
    return `<div class="${cls}">${arr.map((x) => `<span>${escapeHtml(x)}</span>`).join("")}</div>`;
  }

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
    if (current && catOptions.some((o) => o.value === current)) elCategory.value = current;
  }

  function render() {
    const selectedSection = elSection.value;
    const selectedCategory = elCategory.value;
    const q = norm(elSearch.value);
    const includeFramed = !!elIncludeBorderline.checked;
    const out = [];
    let requirementTotal = 0;

    DATA.forEach((b) => {
      const sectionKey = b.section_slug || b.section || "";
      if (selectedSection && sectionKey !== selectedSection) return;

      const cat = b.category || b.badge_type || "";
      if (selectedCategory && cat !== selectedCategory) return;

      const reqsAll = Array.isArray(b.stem_requirements) ? b.stem_requirements : [];
      const reqs = reqsAll.filter((r) => requirementPassesFramedToggle(r, includeFramed));
      if (!reqs.length) return;

      if (q) {
        const hitBadge = norm(b.title).includes(q) || norm(buildBadgeMeta(b)).includes(q);
        const hitReq = reqs.some((r) => {
          const fields = [
            r.ref,
            r.requirement_summary,
            r.text,
            r.why_stem,
            r.leader_framing,
            r.evidence,
            r.caution,
            ...(Array.isArray(r.areas) ? r.areas : []),
            ...(Array.isArray(r.stem_domains) ? r.stem_domains : []),
            ...(Array.isArray(r.stem_thinking) ? r.stem_thinking : []),
            ...(Array.isArray(r.leader_prompts) ? r.leader_prompts : []),
          ];
          return norm(fields.join(" ")).includes(q);
        });
        if (!hitBadge && !hitReq) return;
      }

      requirementTotal += reqs.length;
      const badgeId = b.badge_id || b.id || "";
      const urls = iconUrlsForBadgeId(badgeId);
      const meta = buildBadgeMeta(b);
      const metaHtml = meta ? `<span class="stem-badge-map__badge-meta">${escapeHtml(meta)}</span>` : "";

      const reqHtml = reqs.map((r) => {
        const rel = normaliseRelevance(r);
        const label = relevanceLabel(rel);
        const areas = listHtml(r.areas || r.stem_domains, "stem-req__areas");
        const thinking = listHtml(r.stem_thinking, "stem-req__thinking");
        const summary = r.requirement_summary || r.text || "";
        const why = String(r.why_stem || "").replace(/\n/g, "<br>");
        const framing = r.leader_framing || (Array.isArray(r.leader_prompts) ? r.leader_prompts[0] : "");
        const evidence = r.evidence || "";
        const caution = r.caution || "";

        return `
          <div class="stem-req stem-req--${escapeHtml(rel)}">
            <div class="stem-req__header">
              <span class="stem-req__ref">Req ${escapeHtml(r.ref)}</span>
              <span class="stem-req__relevance stem-req__relevance--${escapeHtml(rel)}">${escapeHtml(label)}</span>
            </div>
            <p class="stem-req__text">${escapeHtml(summary)}</p>
            ${areas}
            ${thinking}
            ${why ? `<p class="stem-req__why"><strong>Why STEM:</strong> ${escapeHtml(why)}</p>` : ""}
            ${framing ? `<p class="stem-req__framing"><strong>Leader framing:</strong> ${escapeHtml(framing)}</p>` : ""}
            ${evidence ? `<p class="stem-req__evidence"><strong>Evidence:</strong> ${escapeHtml(evidence)}</p>` : ""}
            ${caution ? `<p class="stem-req__caution"><strong>Keep it honest:</strong> ${escapeHtml(caution)}</p>` : ""}
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
              <span class="stem-badge-map__count">${reqs.length} link${reqs.length === 1 ? "" : "s"}</span>
            </span>
          </summary>
          <div class="stem-badge-map__reqs">${reqHtml}</div>
        </details>
      `);
    });

    const countLine = out.length
      ? `<p class="stem-badge-map__summary-count">Showing ${out.length} badge${out.length === 1 ? "" : "s"} and ${requirementTotal} STEM link${requirementTotal === 1 ? "" : "s"}.</p>`
      : "";
    elResults.innerHTML = out.length ? countLine + out.join("") : "<p><em>No matches.</em></p>";
  }

  updateCategoryOptions();
  render();

  elSection.addEventListener("change", () => {
    updateCategoryOptions();
    render();
  });
  elCategory.addEventListener("change", render);
  elIncludeBorderline.addEventListener("change", render);
  elSearch.addEventListener("input", () => {
    window.clearTimeout(render._t);
    render._t = window.setTimeout(render, 120);
  });
})();
