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
  const elStatus = document.getElementById("stemMapStatus");
  const elResults = document.getElementById("stemMapResults");

  function norm(s) {
    return String(s || "").toLowerCase().trim();
  }

  function badgeTitle(b) {
    const sec = b.section ? b.section.toUpperCase() : "";
    const cat = b.category ? ` — ${b.category}` : "";
    return `${b.badge_name}${cat}`.trim() + (sec ? ` (${sec})` : "");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function render(badges) {
    const showReasons = elShowReasons.checked;
    const expandAll = elShowReqs.checked;

    elResults.innerHTML = badges.map((b) => {
      const reqs = b.requirements || [];
      const reqHtml = reqs.map((r) => {
        const areas = (r.areas || []).map(escapeHtml).join(", ");
        const reason = showReasons && r.reason ? `<div class="stem-map__reason"><strong>Why STEM:</strong> ${escapeHtml(r.reason)}</div>` : "";
        return `
          <li class="stem-map__req">
            <div class="stem-map__req-head">
              <span class="stem-map__req-id">${escapeHtml(r.id)}</span>
              <span class="stem-map__req-areas">${areas}</span>
            </div>
            <div class="stem-map__req-text">${escapeHtml(r.text)}</div>
            ${reason}
          </li>
        `;
      }).join("");

      const openAttr = expandAll ? " open" : "";
      return `
        <details class="stem-map__card"${openAttr}>
          <summary class="stem-map__card-sum">
            <span class="stem-map__badge">${escapeHtml(b.badge_name)}</span>
            <span class="stem-map__meta">${escapeHtml(b.section || "")}${b.category ? " • " + escapeHtml(b.category) : ""}</span>
            <span class="stem-map__count">${reqs.length} STEM requirement${reqs.length === 1 ? "" : "s"}</span>
          </summary>
          <ul class="stem-map__reqs">${reqHtml}</ul>
        </details>
      `;
    }).join("");

    if (!badges.length) {
      elResults.innerHTML = `<div class="stem-map__empty">No matching STEM-linked requirements found for those filters.</div>`;
    }
  }

  function applyFilters(all) {
    const section = norm(elSection.value);
    const area = elArea.value === "all" ? "all" : elArea.value;
    const q = norm(elSearch.value);
    const sort = elSort.value;

    let out = all.slice();

    if (section !== "all") {
      out = out.filter((b) => norm(b.section) === section);
    }

    if (area !== "all") {
      out = out
        .map((b) => {
          const reqs = (b.requirements || []).filter((r) => (r.areas || []).includes(area));
          return reqs.length ? { ...b, requirements: reqs } : null;
        })
        .filter(Boolean);
    }

    if (q) {
      out = out.filter((b) => {
        const hay = [
          b.badge_name,
          b.category,
          b.section,
          ...(b.requirements || []).map((r) => `${r.id} ${r.text} ${(r.areas || []).join(" ")} ${r.reason || ""}`),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "az") {
      out.sort((a, b) => a.badge_name.localeCompare(b.badge_name));
    } else if (sort === "section") {
      out.sort((a, b) => (a.section || "").localeCompare(b.section || "") || a.badge_name.localeCompare(b.badge_name));
    } else if (sort === "reqcount") {
      out.sort((a, b) => (b.requirements?.length || 0) - (a.requirements?.length || 0) || a.badge_name.localeCompare(b.badge_name));
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
      const all = (data && data.stem_badges) ? data.stem_badges : [];
      elStatus.textContent = `${all.length} STEM-linked badges loaded`;

      const onChange = () => applyFilters(all);
      [elSection, elArea, elSort, elShowReasons, elShowReqs].forEach(el => el.addEventListener("change", onChange));
      elSearch.addEventListener("input", () => applyFilters(all));

      applyFilters(all);
    } catch (e) {
      console.error("[stem_map] load failed:", e);
      elStatus.textContent = "Could not load badge mapping data.";
      elResults.innerHTML = `<div class="stem-map__error">Could not load badge mapping data. (Check the JSON file path.)</div>`;
    }
  }

  init();
})();
