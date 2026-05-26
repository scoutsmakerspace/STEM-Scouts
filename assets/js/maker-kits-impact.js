(function () {
  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    var n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-GB') : String(value);
  }

  function init() {
    var el = document.getElementById('maker-kits-impact');
    if (!el) return;
    var url = el.getAttribute('data-summary-url') || '/assets/data/maker_kits_impact_summary.json';

    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load public impact data: ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var totals = data.totals || {};
        el.querySelectorAll('[data-stat]').forEach(function (node) {
          var key = node.getAttribute('data-stat');
          node.textContent = formatNumber(totals[key]);
        });
        var note = document.getElementById('maker-kits-impact-note');
        if (note) {
          var generated = data.generated_at ? 'Generated: ' + data.generated_at : '';
          var privacy = data.privacy_level ? 'Privacy level: ' + data.privacy_level : '';
          note.textContent = [generated, privacy].filter(Boolean).join('. ');
        }
        var assumptions = document.getElementById('maker-kits-impact-assumptions');
        if (assumptions && data.assumptions) {
          assumptions.innerHTML = '';
          Object.keys(data.assumptions).forEach(function (key) {
            var li = document.createElement('li');
            li.textContent = data.assumptions[key];
            assumptions.appendChild(li);
          });
        }
      })
      .catch(function () {
        el.querySelectorAll('[data-stat]').forEach(function (node) { node.textContent = '—'; });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
