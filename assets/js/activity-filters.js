(function () {
  function $(id){ return document.getElementById(id); }
  function norm(s){ return (s || '').toString().toLowerCase(); }

  function tokenMatch(hay, q){
    q = norm(q).trim();
    if (!q) return true;
    var tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every(function(t){ return hay.indexOf(t) !== -1; });
  }

  function init(){
    var searchEl = $('actSearch');
    var timeEl = $('actTime');
    var diffEl = $('actDiff');
    var locEl = $('actLoc');
    var typeEl = $('actType');
    var supEl = $('actSup');
    var badgeEl = $('actBadge');
    var toggleEl = $('actToggle');
    var advEl = $('actAdvanced');
    var resetEl = $('actReset');
   

    var items = Array.prototype.slice.call(document.querySelectorAll('.activity-index__item'));
    if (!items.length || !searchEl) return;


    function apply(){
      var q = searchEl.value || "";
      var maxTime = parseInt(timeEl && timeEl.value, 10);
      var maxDiff = parseInt(diffEl && diffEl.value, 10);
      var loc = norm(locEl && locEl.value);
      var type = norm(typeEl && typeEl.value);
      var sup = norm(supEl && supEl.value);
      var badge = norm(badgeEl && badgeEl.value);

      var visible = 0;

      items.forEach(function(el){
        var hay = (el.getAttribute('data-title') || '') + ' ' +
                  (el.getAttribute('data-summary') || '') + ' ' +
                  (el.getAttribute('data-badge-text') || '');

        var t = parseInt(el.getAttribute('data-time') || '', 10);
        var d = parseInt(el.getAttribute('data-difficulty') || '', 10);

        var okSearch = tokenMatch(hay, q);
        var okTime = !maxTime || (!isNaN(t) && t <= maxTime);
        var okDiff = !maxDiff || (!isNaN(d) && d <= maxDiff);
        var okLoc = !loc || norm(el.getAttribute('data-location')) === loc;
        var okType = !type || norm(el.getAttribute('data-type')) === type;
        var okSup = !sup || norm(el.getAttribute('data-supervision')) === sup;

        // Badge filter matches by badge id (no requirements involved)
        var badges = norm(el.getAttribute('data-badges') || '');
        var okBadge = !badge || (('|' + badges + '|').indexOf('|' + badge + '|') !== -1);

        var show = okSearch && okTime && okDiff && okLoc && okType && okSup && okBadge;
        el.style.display = show ? "" : "none";
        if (show) visible++;
      });

      
    }

    function reset(){
      searchEl.value = "";
      if (timeEl) timeEl.value = "";
      if (diffEl) diffEl.value = "";
      if (locEl) locEl.value = "";
      if (typeEl) typeEl.value = "";
      if (supEl) supEl.value = "";
      if (badgeEl) badgeEl.value = "";
      apply();
    }
  
  if (toggleEl && advEl) {
    // Force initial state every time (prevents "stuck open" due to cached HTML/CSS)
    advEl.hidden = true;
    toggleEl.setAttribute('aria-expanded', 'false');
  
    toggleEl.addEventListener('click', function () {
      advEl.hidden = !advEl.hidden;
      toggleEl.setAttribute('aria-expanded', String(!advEl.hidden));
    });
  }



    searchEl.addEventListener('input', apply);
    [timeEl, diffEl, locEl, typeEl, supEl].forEach(function(el){
      if (el) el.addEventListener('change', apply);
    });

    if (badgeEl) badgeEl.addEventListener('change', apply);
    if (resetEl) resetEl.addEventListener('click', reset);

    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
