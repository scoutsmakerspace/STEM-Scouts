(function () {
  const root = document.querySelector(".stem-map__panel");
  if (!root) return;

  const jsonUrl = root.getAttribute("data-json-url");

  const elSection = document.getElementById("stemMapSection");
  const elArea = document.getElementById("stemMapArea");
  const elSearch = document.getElementById("stemMapSearch");
  const elSort = document.getElementById("stemMapSort");
  const elShowReasons = document.getElementById("stemMapShowReasons");
  const elShowReqs = document.getElementById("stemMapShowReqs");
  const elIncludeBorderline = document.getElementById("stemMapIncludeBorderline");
  const elStatus = document.getElementById("stemMapStatus");
  const elResults = document.getElementById("stemMapResults");

  function norm(s) {
    return String(s || "").toLowerCase().trim();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Accept multiple JSON shapes so we can evolve the generator without breaking the page.
  function normalizeData(data) {
    if (!data) return [];

    // Legacy shape: { stem_badges: [ { requirements: [...] } ] }
    if (Array.isArray(data.stem_badges)) return data.stem_badges;

    // New shape: { badges: [ { stem_requirements: [...] } ] }
    if (Array.isArray(data.badges)) {
      return data.badges.map((b) => ({
        id: b.id,
        section: b.section,
        badge_name: b.badge_name,
        category: b.category,
        type: b.type,
        areas: b.areas || [],
        requirements: Array.isArray(b.stem_requirements) ? b.stem_requirements : [],
      }));
    }

    return [];
  }

  function render(badges) {
    const showReasons = !!(elShowReasons && elShowReasons.checked);
    const expandAll = !!(elShowReqs && elShowReqs.checked);

    if (!badges.length) {
      elResults.innerHTML = `<div class="stem-map__empty">No matching STEM-linked requirements found for those filters.</div>`;
      return;
    }

    elResults.innerHTML = badges
      .map((b) => {
        const reqs = b.requirements || [];
        const reqHtml = reqs
          .map((r) => {
            const areas = (r.areas || []).map(escapeHtml).join(", ");
            const strength = norm(r.strength) === "borderline" ? "borderline" : "strong";
            const tag =
              strength === "borderline"
                ? `<span class="stem-map__tag stem-map__tag--borderline">Borderline</span>`
                : `<span class="stem-map__tag stem-map__tag--strong">Strong</span>`;

            const reason =
              showReasons && r.reason
                ? `<div class="stem-map__reason"><strong>Why STEM:</strong> ${escapeHtml(r.reason)}</div>`
                : "";

            return `
              <li class="stem-map__req">
                <div class="stem-map__req-head">
                  <span class="stem-map__req-id">${escapeHtml(r.id)}</span>
                  ${tag}
                  <span class="stem-map__req-areas">${areas}</span>
                </div>
                <div class="stem-map__req-text">${escapeHtml(r.text)}</div>
                ${reason}
              </li>
            `;
          })
          .join("");

        const openAttr = expandAll ? " open" : "";
        const countLabel = `${reqs.length} STEM requirement${reqs.length === 1 ? "" : "s"}`;

        return `
          <details class="stem-map__card"${openAttr}>
            <summary class="stem-map__card-sum">
              <span class="stem-map__badge">${escapeHtml(b.badge_name)}</span>
              <span class="stem-map__meta">${escapeHtml(b.section || "")}${b.category ? " • " + escapeHtml(b.category) : ""}</span>
              <span class="stem-map__count">${countLabel}</span>
            </summary>
            <ul class="stem-map__reqs">${reqHtml}</ul>
          </details>
        `;
      })
      .join("");
  }

  function applyFilters(all) {
    const section = norm(elSection ? elSection.value : "all");
    const area = elArea && elArea.value !== "all" ? elArea.value : "all";
    const q = norm(elSearch ? elSearch.value : "");
    const sort = elSort ? elSort.value : "az";
    const includeBorderline = !!(elIncludeBorderline && elIncludeBorderline.checked);

    let out = all.slice();

    if (section !== "all") {
      out = out.filter((b) => norm(b.section) === section);
    }

    // Filter requirements by STEM area and/or borderline/strong
    out = out
      .map((b) => {
        let reqs = (b.requirements || []).slice();

        if (!includeBorderline) {
          reqs = reqs.filter((r) => norm(r.strength) !== "borderline");
        }

        if (area !== "all") {
          reqs = reqs.filter((r) => (r.areas || []).includes(area));
        }

        return reqs.length ? { ...b, requirements: reqs } : null;
      })
      .filter(Boolean);

    if (q) {
      out = out.filter((b) => {
        const hay = [
          b.badge_name,
          b.category,
          b.section,
          ...(b.requirements || []).map((r) => `${r.id} ${r.text} ${(r.areas || []).join(" ")} ${r.reason || ""} ${r.strength || ""}`),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "az") {
      out.sort((a, b) => (a.badge_name || "").localeCompare(b.badge_name || ""));
    } else if (sort === "section") {
      out.sort(
        (a, b) =>
          (a.section || "").localeCompare(b.section || "") ||
          (a.badge_name || "").localeCompare(b.badge_name || "")
      );
    } else if (sort === "reqcount") {
      out.sort(
        (a, b) =>
          ((b.requirements || []).length - (a.requirements || []).length) ||
          (a.badge_name || "").localeCompare(b.badge_name || "")
      );
    }

    elStatus.textContent = `${out.length} badge${out.length === 1 ? "" : "s"} shown`;
    render(out);
  }

  async function init() {
    try {
      elStatus.textContent = "Loading STEM badge mapping…";
      const res = await fetch(jsonUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const all = normalizeData(data);

      elStatus.textContent = `${all.length} STEM-linked badges loaded`;

      const onChange = () => applyFilters(all);
      [elSection, elArea, elSort, elShowReasons, elShowReqs, elIncludeBorderline]
        .filter(Boolean)
        .forEach((el) => el.addEventListener("change", onChange));

      if (elSearch) elSearch.addEventListener("input", () => applyFilters(all));

      applyFilters(all);
    } catch (e) {
      console.error("[stem_map] load failed:", e);
      elStatus.textContent = "Could not load badge mapping data.";
      elResults.innerHTML = `<div class="stem-map__error">Could not load badge mapping data. (Check the JSON file path.)</div>`;
    }
  }

  init();
})();