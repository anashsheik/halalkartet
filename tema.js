// Lyst tema fra soloppgang til solnedgang i Oslo, mørkt ellers. Egen fil fordi CSP-en ikke tillater inline-skript.
(function () {
  var NOKKEL = 'halalkartet-tema';
  var LAT = 59.91, LNG = 10.75;
  var DAG = 864e5, RAD = Math.PI / 180;
  var rot = document.documentElement;

  // Soloppgang og solnedgang (ms) for soldøgn n, regnet i dager fra 1. januar 2000.
  function sol(n) {
    var j = n - LNG / 360;
    var m = (357.5291 + 0.98560028 * j) % 360;
    var c = 1.9148 * Math.sin(m * RAD) + 0.02 * Math.sin(2 * m * RAD) + 0.0003 * Math.sin(3 * m * RAD);
    var l = (m + c + 282.9372) % 360;
    var midt = 2451545 + j + 0.0053 * Math.sin(m * RAD) - 0.0069 * Math.sin(2 * l * RAD);
    var dekl = Math.asin(Math.sin(l * RAD) * Math.sin(23.4397 * RAD));
    var cosw = (Math.sin(-0.833 * RAD) - Math.sin(LAT * RAD) * Math.sin(dekl)) / (Math.cos(LAT * RAD) * Math.cos(dekl));
    var w = Math.acos(Math.max(-1, Math.min(1, cosw))) / RAD / 360;
    return [(midt - w - 2440587.5) * DAG, (midt + w - 2440587.5) * DAG];
  }

  function etterSola(t) {
    var n = Math.round(t / DAG + 2440587.5 - 2451545);
    var lyst = false, neste = Infinity;
    for (var d = n - 1; d <= n + 2; d++) {
      var s = sol(d);
      if (t >= s[0] && t < s[1]) lyst = true;
      if (s[0] > t) neste = Math.min(neste, s[0]);
      if (s[1] > t) neste = Math.min(neste, s[1]);
    }
    return { tema: lyst ? 'light' : 'dark', neste: neste };
  }

  // Et valg med bryteren gjelder til neste soloppgang eller solnedgang.
  function lagret() {
    try {
      var v = JSON.parse(localStorage.getItem(NOKKEL));
      return v && v.til > Date.now() ? v.tema : null;
    } catch (e) { return null; }
  }
  function na() { return rot.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function sett(t) {
    if (rot.getAttribute('data-theme') === t) return;
    rot.setAttribute('data-theme', t);
    try { window.dispatchEvent(new Event('temaendring')); } catch (e) {}
  }
  function oppdater() { sett(lagret() || etterSola(Date.now()).tema); }

  oppdater();
  setInterval(oppdater, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) oppdater(); });

  window.halalTema = {
    na: na,
    sol: etterSola,
    bytt: function () {
      var t = na() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(NOKKEL, JSON.stringify({ tema: t, til: etterSola(Date.now()).neste })); } catch (e) {}
      sett(t);
      return t;
    }
  };
})();
