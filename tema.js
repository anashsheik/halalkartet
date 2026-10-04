// Setter tema før siden tegnes. Egen fil fordi CSP-en ikke tillater inline-skript.
(function () {
  var NOKKEL = 'halalkartet-tema';
  var rot = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function lagret() { try { return localStorage.getItem(NOKKEL); } catch (e) { return null; } }
  function sett(t) { rot.setAttribute('data-theme', t); }
  function varsle() { try { window.dispatchEvent(new Event('temaendring')); } catch (e) {} }

  sett(lagret() || (mq && mq.matches ? 'dark' : 'light'));

  if (mq) {
    var endret = function (e) { if (!lagret()) { sett(e.matches ? 'dark' : 'light'); varsle(); } };
    if (mq.addEventListener) mq.addEventListener('change', endret);
    else if (mq.addListener) mq.addListener(endret);
  }

  window.halalTema = {
    na: function () { return rot.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    bytt: function () {
      var t = this.na() === 'dark' ? 'light' : 'dark';
      sett(t);
      try { localStorage.setItem(NOKKEL, t); } catch (e) {}
      varsle();
      return t;
    }
  };
})();
