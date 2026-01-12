(() => {
  const elSection = document.getElementById("stemSectionSelect");
  const elCategory = document.getElementById("stemCategorySelect");
  const elSearch = document.getElementById("stemSearchInput");
  const elBorderline = document.getElementById("stemIncludeBorderline");
  const elResults = document.getElementById("stemBadgeMapResults");

  if (!elSection || !elCategory || !elSearch || !elBorderline || !elResults) return;

  const toNorm = (v) => String(v || "").trim().toLowerCase();
  const safe = (v) => String(v == null ? "" : v);

  const data =
    window.STEM_BADGE_MAP_DATA && Array.isArray(window.STEM_BADGE_MAP_DATA.badges)
      ? window.STEM_BADGE_MAP_DATA
      : { badges: [] };

  const allBadges = data.badges || [];

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  function badgeIconUrl(badgeId) {
    const id = encodeURIComponent(String(badgeId || ""));
    return `${window.siteBaseUrl || ""}/assets/images/badges/${id}.png`;
  }

  function initFilters() {
    const sections = uniq(allBadges.map((b) => b.section)).sort((a, b) => a.localeCompare(b));
    const categories = uniq(allBadges.map((b) => b.category)).sort((a, b) => a.localeCompare(b));

    elSection.innerHTML = "";
    elCategory.innerHTML = "";

    const optAllS = document.createElement("option");
    optAllS.value = "all";
    optAllS.textContent = "All";
    elSection.appendChild(optAllS);
    sections.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = toNorm(s);
      opt.textContent = s;
      elSection.appendChild(opt);
    });

    const optAllC = document.createElement("option");
    optAllC.value = "all";
    optAllC.textContent = "All";
    elCategory.appendChild(optAllC);
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = toNorm(c);
      opt.textContent = c;
      elCategory.appendChild(opt);
    });
  }

  function matchesSearch(badge, q) {
    if (!q) return true;
    const hay = [
      badge.title,
      badge.section,
      badge.category,
      ...(badge.stem_requirements || []).map((r) => r.text),
      ...(badge.stem_requirements || []).map((r) => r.why_stem),
      ...(badge.stem_requirements || []).map((r) => (r.areas || []).join(" ")),
    ]
      .map(safe)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function filterBadges() {
    const sec = elSection.value;
    const cat = elCategory.value;
    const q = toNorm(elSearch.value);
    const includeBorderline = !!elBorderline.checked;

    return allBadges.filter((b) => {
      if (sec !== "all" && toNorm(b.section) !== sec) return false;
      if (cat !== "all" && toNorm(b.category) !== cat) return false;

      const reqs = Array.isArray(b.stem_requirements) ? b.stem_requirements : [];
      const eligibleReqs = includeBorderline
        ? reqs
        : reqs.filter((r) => String(r.strength || "").toLowerCase() !== "borderline");

      const b2 = { ...b, stem_requirements: eligibleReqs };
      if (!matchesSearch(b2, q)) return false;

      return eligibleReqs.length > 0;
    });
  }

  function render() {
    const list = filterBadges();

    if (!list.length) {
      elResults.innerHTML = "<p><em>No matches.</em></p>";
      return;
    }

    elResults.innerHTML = "";

    list.forEach((b) => {
      const card = document.createElement("details");
      card.className = "stem-badge-card";

      const summary = document.createElement("summary");
      summary.className = "stem-badge-card__summary";

      const left = document.createElement("div");
      left.className = "stem-badge-card__left";

      const img = document.createElement("img");
      img.className = "stem-badge-card__icon";
      img.alt = safe(b.title);
      img.loading = "lazy";
      img.src = badgeIconUrl(b.badge_id);
      img.onerror = () => {
        img.src = `${window.siteBaseUrl || ""}/assets/images/badges/missing.png`;
      };

      const titleWrap = document.createElement("div");
      titleWrap.className = "stem-badge-card__titlewrap";

      const title = document.createElement("div");
      title.className = "stem-badge-card__title";
      title.textContent = safe(b.title);

      const meta = document.createElement("div");
      meta.className = "stem-badge-card__meta";
      meta.textContent = `${safe(b.section)} · ${safe(b.category)}`;

      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);

      left.appendChild(img);
      left.appendChild(titleWrap);

      const right = document.createElement("div");
      right.className = "stem-badge-card__right";
      const reqCount = Array.isArray(b.stem_requirements) ? b.stem_requirements.length : 0;
      right.textContent = `${reqCount} requirement${reqCount === 1 ? "" : "s"}`;

      summary.appendChild(left);
      summary.appendChild(right);
      card.appendChild(summary);

      const body = document.createElement("div");
      body.className = "stem-badge-card__body";

      (b.stem_requirements || []).forEach((r) => {
        const row = document.createElement("div");
        row.className = "stem-req";

        const head = document.createElement("div");
        head.className = "stem-req__head";

        const ref = document.createElement("div");
        ref.className = "stem-req__ref";
        ref.textContent = safe(r.ref);

        const text = document.createElement("div");
        text.className = "stem-req__text";
        text.textContent = safe(r.text);

        head.appendChild(ref);
        head.appendChild(text);

        const chips = document.createElement("div");
        chips.className = "stem-req__chips";

        const strength = safe(r.strength);
        if (strength) {
          const chip = document.createElement("span");
          chip.className = `stem-chip stem-chip--${toNorm(strength)}`;
          chip.textContent = strength;
          chips.appendChild(chip);
        }

        const areas = Array.isArray(r.areas) ? r.areas : [];
        areas.forEach((a) => {
          const chip = document.createElement("span");
          chip.className = "stem-chip";
          chip.textContent = safe(a);
          chips.appendChild(chip);
        });

        const why = safe(r.why_stem);
        if (why) {
          const whyP = document.createElement("p");
          whyP.className = "stem-req__why";
          whyP.innerHTML = `<strong>Why STEM:</strong> ${why}`;
          row.appendChild(head);
          row.appendChild(chips);
          row.appendChild(whyP);
        } else {
          row.appendChild(head);
          row.appendChild(chips);
        }

        const lp = safe(r.leader_prompts);
        if (lp) {
          const lpDetails = document.createElement("details");
          lpDetails.className = "stem-req__lp";
          const lpSummary = document.createElement("summary");
          lpSummary.textContent = "Leader prompts";
          const lpBody = document.createElement("div");
          lpBody.className = "stem-req__lpbody";
          lpBody.textContent = lp;
          lpDetails.appendChild(lpSummary);
          lpDetails.appendChild(lpBody);
          row.appendChild(lpDetails);
        }

        body.appendChild(row);
      });

      card.appendChild(body);
      elResults.appendChild(card);
    });
  }

  initFilters();
  render();

  elSection.addEventListener("change", render);
  elCategory.addEventListener("change", render);
  elSearch.addEventListener("input", render);
  elBorderline.addEventListener("change", render);
})();
