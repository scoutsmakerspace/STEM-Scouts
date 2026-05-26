(function () {
  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    var n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-GB') : String(value);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalise(value) {
    return String(value || '').toLowerCase().trim();
  }

  function markerSize(groups) {
    var n = Number(groups || 1);
    return Math.max(28, Math.min(48, 24 + Math.sqrt(n) * 8));
  }

  function makeIcon(props) {
    var groups = Number(props.groups_supported || props.public_entries || 1);
    var size = markerSize(groups);
    var className = 'mk-map-marker' + (Number(props.repeat_entries || 0) > 0 ? ' mk-map-marker--repeat' : '');
    return L.divIcon({
      className: '',
      html: '<div class="' + className + '" style="width:' + size + 'px;height:' + size + 'px;">' + formatNumber(groups) + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  }

  function makePopup(feature) {
    var p = feature.properties || {};
    var groupDetails = p.group_details || [];
    var groupList = '';
    if (groupDetails.length) {
      groupList = '<ul class="mk-popup-groups">' + groupDetails.map(function (g) {
        var entries = Number(g.entries || 1);
        var badge = entries > 1 ? '<span class="mk-popup-badge">repeat supporter ×' + entries + '</span>' : '';
        return '<li>' + escapeHtml(g.name || g) + badge + '</li>';
      }).join('') + '</ul>';
    } else if (p.public_group_names && p.public_group_names.length) {
      groupList = '<ul class="mk-popup-groups">' + p.public_group_names.map(function (name) {
        return '<li>' + escapeHtml(name) + '</li>';
      }).join('') + '</ul>';
    }

    return '<div class="mk-popup-title">' + escapeHtml(p.display_area || p.postcode_district || 'Approximate area') + '</div>' +
      '<div class="mk-popup-line"><strong>Postcode district:</strong> ' + escapeHtml(p.postcode_district || '—') + '</div>' +
      '<div class="mk-popup-line"><strong>Groups supported here:</strong> ' + formatNumber(p.groups_supported) + '</div>' +
      '<div class="mk-popup-line"><strong>Public entries:</strong> ' + formatNumber(p.public_entries || p.groups_supported) + '</div>' +
      '<div class="mk-popup-line"><strong>Kits supplied:</strong> ' + escapeHtml(p.kits_supplied_band || 'not shown') + '</div>' +
      (groupList ? '<div class="mk-popup-line"><strong>Public supporter names:</strong>' + groupList + '</div>' : '') +
      '<div class="mk-popup-line mk-muted">Approximate public location only. No contact details or addresses are shown.</div>';
  }

  function flattenGroupRows(features) {
    var rows = [];
    features.forEach(function (feature) {
      var p = feature.properties || {};
      var coords = feature.geometry && feature.geometry.coordinates ? feature.geometry.coordinates : null;
      var groups = p.group_details || (p.public_group_names || []).map(function (name) { return { name: name, entries: 1 }; });
      if (!groups.length) {
        rows.push({
          label: p.display_area || p.postcode_district,
          subtitle: (p.postcode_district || '') + ' · ' + formatNumber(p.groups_supported) + ' group(s)',
          search: [p.display_area, p.postcode_district].join(' '),
          feature: feature,
          coords: coords
        });
        return;
      }
      groups.forEach(function (g) {
        var entries = Number(g.entries || 1);
        rows.push({
          label: g.name || String(g),
          subtitle: (p.display_area || p.postcode_district || 'Area') + ' · ' + (entries > 1 ? 'repeat supporter ×' + entries : 'supporter'),
          search: [g.name || g, p.display_area, p.postcode_district, p.kits_supplied_band].join(' '),
          feature: feature,
          coords: coords
        });
      });
    });
    rows.sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
    return rows;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = formatNumber(value);
  }

  function calculateTotals(geojson) {
    var features = geojson.features || [];
    var groupSet = new Set();
    var publicEntries = 0;
    var repeatEntries = 0;
    features.forEach(function (feature) {
      var p = feature.properties || {};
      publicEntries += Number(p.public_entries || p.groups_supported || 0);
      repeatEntries += Number(p.repeat_entries || 0);
      (p.public_group_names || []).forEach(function (name) { if (name) groupSet.add(name); });
    });
    return {
      districts: features.length,
      uniqueGroups: groupSet.size || features.reduce(function (sum, f) { return sum + Number((f.properties || {}).groups_supported || 0); }, 0),
      publicEntries: publicEntries,
      repeatEntries: repeatEntries
    };
  }

  function init() {
    var el = document.getElementById('maker-kits-map');
    if (!el) return;
    if (!window.L) {
      el.innerHTML = '<p class="mk-warning-card">Map library did not load. Please check the Leaflet script link.</p>';
      return;
    }

    var url = el.getAttribute('data-geojson-url') || '/assets/data/maker_kits_public_map.geojson';
    el.innerHTML = '';

    var map = L.map(el, {
      scrollWheelZoom: true,
      preferCanvas: true,
      zoomControl: true
    }).setView([54.5, -3.2], 5);

    var light = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    var dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    L.control.layers({
      'OpenStreetMap': light,
      'Clean light map': carto,
      'Dark map': dark
    }, null, { collapsed: true }).addTo(map);

    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load public map data: ' + r.status);
        return r.json();
      })
      .then(function (geojson) {
        var features = geojson.features || [];
        var clusterAvailable = typeof L.markerClusterGroup === 'function';
        var layerGroup = clusterAvailable ? L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 42
        }) : L.layerGroup();
        var allMarkers = [];

        features.forEach(function (feature) {
          var p = feature.properties || {};
          var coords = feature.geometry && feature.geometry.coordinates;
          if (!coords || coords.length < 2) return;
          var latlng = L.latLng(coords[1], coords[0]);
          var marker = L.marker(latlng, { icon: makeIcon(p), keyboard: true });
          marker.bindPopup(makePopup(feature), { maxWidth: 360 });
          marker.__feature = feature;
          marker.__search = normalise([
            p.postcode_district,
            p.display_area,
            p.kits_supplied_band,
            (p.public_group_names || []).join(' ')
          ].join(' '));
          layerGroup.addLayer(marker);
          allMarkers.push(marker);
        });
        layerGroup.addTo(map);

        var bounds = L.featureGroup(allMarkers).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.12));
        setTimeout(function () { map.invalidateSize(); }, 100);
        setTimeout(function () { map.invalidateSize(); }, 500);

        var totals = calculateTotals(geojson);
        setText('mk-map-stat-groups', totals.uniqueGroups);
        setText('mk-map-stat-entries', totals.publicEntries);
        setText('mk-map-stat-repeat', totals.repeatEntries);
        setText('mk-map-stat-districts', totals.districts);
        var mode = document.getElementById('mk-map-stat-mode');
        if (mode) mode.textContent = (geojson.metadata && geojson.metadata.privacy_level) || 'public';

        var rows = flattenGroupRows(features);
        var list = document.getElementById('maker-kits-group-list');
        var search = document.getElementById('maker-kits-map-search');
        var clearBtn = document.getElementById('maker-kits-clear-search');
        var resetBtn = document.getElementById('maker-kits-reset-map');
        var toggleBtn = document.getElementById('maker-kits-toggle-list');

        function zoomToFeature(feature) {
          var found = allMarkers.find(function (m) { return m.__feature === feature; });
          if (!found) return;
          function open() {
            map.setView(found.getLatLng(), Math.max(map.getZoom(), 9));
            found.openPopup();
          }
          if (clusterAvailable && layerGroup.zoomToShowLayer) layerGroup.zoomToShowLayer(found, open);
          else open();
        }

        function renderList(query) {
          if (!list) return;
          var q = normalise(query);
          var shown = rows.filter(function (row) { return !q || normalise(row.search).indexOf(q) !== -1; }).slice(0, 260);
          list.innerHTML = '';
          if (!shown.length) {
            list.innerHTML = '<div class="mk-map-list-empty">No matching public supporters or areas found.</div>';
            return;
          }
          shown.forEach(function (row) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'mk-map-list-item';
            var title = document.createElement('strong');
            title.textContent = row.label;
            var subtitle = document.createElement('span');
            subtitle.textContent = row.subtitle;
            item.appendChild(title);
            item.appendChild(subtitle);
            item.addEventListener('click', function () { zoomToFeature(row.feature); });
            list.appendChild(item);
          });
        }

        function applySearch() {
          var q = search ? normalise(search.value) : '';
          renderList(q);
          allMarkers.forEach(function (marker) {
            var match = !q || marker.__search.indexOf(q) !== -1;
            if (clusterAvailable) {
              if (match && !layerGroup.hasLayer(marker)) layerGroup.addLayer(marker);
              if (!match && layerGroup.hasLayer(marker)) layerGroup.removeLayer(marker);
            } else {
              if (match && !map.hasLayer(marker)) marker.addTo(map);
              if (!match && map.hasLayer(marker)) map.removeLayer(marker);
            }
          });
        }

        if (search) search.addEventListener('input', applySearch);
        if (clearBtn) clearBtn.addEventListener('click', function () { if (search) search.value = ''; applySearch(); });
        if (resetBtn) resetBtn.addEventListener('click', function () {
          if (search) search.value = '';
          applySearch();
          if (bounds.isValid()) map.fitBounds(bounds.pad(0.12));
        });
        if (toggleBtn && list) toggleBtn.addEventListener('click', function () {
          var panel = document.querySelector('.mk-map-side-panel');
          if (!panel) return;
          panel.hidden = !panel.hidden;
          setTimeout(function () { map.invalidateSize(); }, 80);
        });

        renderList('');
      })
      .catch(function (err) {
        el.innerHTML = '<p class="mk-warning-card">' + escapeHtml(err.message) + '</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
