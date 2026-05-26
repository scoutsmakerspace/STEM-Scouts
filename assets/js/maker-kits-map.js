(function () {
  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("en-GB") : String(value);
  }

  function markerRadius(props) {
    var n = Number((props && (props.unique_groups_supported || props.groups_supported || props.public_map_entries)) || 1);
    return Math.max(7, Math.min(22, 6 + Math.sqrt(n) * 4));
  }

  function htmlEscape(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function init() {
    var el = document.getElementById("maker-kits-map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = "<p class='mk-warning-card'>Map library did not load. Please refresh the page and try again.</p>";
      return;
    }

    var url = el.getAttribute("data-geojson-url") || "/assets/data/maker_kits_public_map.geojson";
    el.innerHTML = "";

    var map = L.map(el, {
      scrollWheelZoom: false,
      preferCanvas: true
    }).setView([54.5, -3.2], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    function refreshSize() {
      try { map.invalidateSize(); } catch (e) {}
    }
    window.addEventListener("load", refreshSize);
    window.addEventListener("resize", refreshSize);
    setTimeout(refreshSize, 150);
    setTimeout(refreshSize, 600);

    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load public map data: " + r.status);
        return r.json();
      })
      .then(function (geojson) {
        var layer = L.geoJSON(geojson, {
          pointToLayer: function (feature, latlng) {
            var props = feature.properties || {};
            return L.circleMarker(latlng, {
              radius: markerRadius(props),
              weight: 1,
              fillOpacity: 0.72
            });
          },
          onEachFeature: function (feature, layer) {
            var p = feature.properties || {};
            var uniqueGroups = p.unique_groups_supported || p.groups_supported;
            var entries = p.public_map_entries;
            var repeatEntries = p.returning_group_entries;
            var html = "<div class='mk-popup-title'>" + htmlEscape(p.display_area || p.postcode_district || "Approximate area") + "</div>" +
              "<div class='mk-popup-line'><strong>Postcode district:</strong> " + htmlEscape(p.postcode_district || "—") + "</div>" +
              "<div class='mk-popup-line'><strong>Unique groups:</strong> " + formatNumber(uniqueGroups) + "</div>" +
              "<div class='mk-popup-line'><strong>Order/map entries:</strong> " + formatNumber(entries || uniqueGroups) + "</div>" +
              (repeatEntries ? "<div class='mk-popup-line'><strong>Repeat entries:</strong> " + formatNumber(repeatEntries) + "</div>" : "") +
              "<div class='mk-popup-line'><strong>Kits supplied:</strong> " + htmlEscape(p.kits_supplied_band || "not shown") + "</div>" +
              "<div class='mk-popup-line mk-muted'>Approximate public location only.</div>";
            layer.bindPopup(html);
          }
        }).addTo(map);

        try {
          var bounds = layer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds.pad(0.12));
        } catch (e) {}
        refreshSize();
      })
      .catch(function (err) {
        el.innerHTML = "<p class='mk-warning-card'>" + htmlEscape(err.message) + "</p>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
