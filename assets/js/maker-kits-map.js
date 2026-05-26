(function () {
  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("en-GB") : String(value);
  }

  function markerRadius(groups) {
    var n = Number(groups || 1);
    return Math.max(6, Math.min(18, 5 + Math.sqrt(n) * 4));
  }

  function init() {
    var el = document.getElementById("maker-kits-map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = "<p class='mk-warning-card'>Map library did not load. Please check the Leaflet script link.</p>";
      return;
    }

    var url = el.getAttribute("data-geojson-url") || "/assets/data/maker_kits_public_map.geojson";
    el.innerHTML = "";

    var map = L.map(el, { scrollWheelZoom: false }).setView([54.5, -3.2], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

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
              radius: markerRadius(props.groups_supported),
              weight: 1,
              fillOpacity: 0.72
            });
          },
          onEachFeature: function (feature, layer) {
            var p = feature.properties || {};
            var html = "<div class='mk-popup-title'>" + (p.display_area || p.postcode_district || "Approximate area") + "</div>" +
              "<div class='mk-popup-line'><strong>Postcode district:</strong> " + (p.postcode_district || "—") + "</div>" +
              "<div class='mk-popup-line'><strong>Groups supported:</strong> " + formatNumber(p.groups_supported) + "</div>" +
              "<div class='mk-popup-line'><strong>Kits supplied:</strong> " + (p.kits_supplied_band || "not shown") + "</div>" +
              "<div class='mk-popup-line mk-muted'>Approximate public location only.</div>";
            layer.bindPopup(html);
          }
        }).addTo(map);

        try {
          var bounds = layer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds.pad(0.15));
        } catch (e) {}
      })
      .catch(function (err) {
        el.innerHTML = "<p class='mk-warning-card'>" + err.message + "</p>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
