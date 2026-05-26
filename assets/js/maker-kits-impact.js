(function () {
  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("en-GB") : String(value);
  }

  function init() {
    var el = document.getElementById("maker-kits-impact");
    if (!el) return;
    var url = el.getAttribute("data-summary-url") || "/assets/data/maker_kits_impact_summary.json";

    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load public impact data: " + r.status);
        return r.json();
      })
      .then(function (data) {
        var totals = data.totals || {};
        if (totals.public_map_entries === undefined && totals.groups_supported !== undefined) {
          totals.public_map_entries = totals.groups_supported;
        }
        if (totals.returning_group_entries === undefined && totals.public_map_entries !== undefined && totals.groups_supported !== undefined) {
          totals.returning_group_entries = Math.max(0, Number(totals.public_map_entries) - Number(totals.groups_supported));
        }
        el.querySelectorAll("[data-stat]").forEach(function (node) {
          var key = node.getAttribute("data-stat");
          node.textContent = formatNumber(totals[key]);
        });
        var note = document.getElementById("maker-kits-impact-note");
        if (note) {
          var generated = data.generated_at ? "Updated: " + data.generated_at.substring(0, 10) : "";
          var source = data.source_tool_version ? "Source: public export " + data.source_tool_version : "";
          note.textContent = [generated, source].filter(Boolean).join(". ");
        }
      })
      .catch(function () {
        el.querySelectorAll("[data-stat]").forEach(function (node) { node.textContent = "—"; });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
