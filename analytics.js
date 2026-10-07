/* Besøkstelling med GoatCounter (halalkartet.goatcounter.com).
   Ingen cookies, ingenting lagres i nettleseren, og GoatCounter lagrer ikke IP-adressen.
   Vi sender bare hvilken side som ble åpnet, domenet besøket kom fra, og navnet på hendelser
   som «filter_kjokken: Indisk». Ikke skjermstørrelse, ikke søketekst og ikke noe fra skjemaene.
   Bare det ekte domenet telles, så lokale kopier og testene ikke blir med i tallene. */
(function () {
  var ENDEPUNKT = 'https://halalkartet.goatcounter.com/count';
  var ekte = /(^|\.)halalkartet\.no$/.test(location.hostname) && !navigator.webdriver;

  function send(sti, hendelse) {
    if (!ekte) return;
    var q = new URLSearchParams({ p: sti, t: document.title, e: hendelse ? 'true' : 'false', rnd: Math.random().toString(36).slice(2) });
    // bare domenet: hele adressen kan inneholde søket folk gjorde på en annen side
    if (!hendelse && document.referrer) {
      try {
        var fra = new URL(document.referrer);
        if (fra.hostname !== location.hostname) q.set('r', fra.origin);
      } catch (e) {}
    }
    new Image().src = ENDEPUNKT + '?' + q.toString();
  }

  // app.js kaller denne for hendelser: navnet, og den første verdien hvis det er en
  window.halalTell = function (navn, verdier) {
    var v = verdier && Object.keys(verdier).length ? verdier[Object.keys(verdier)[0]] : null;
    send(navn + (v !== null && v !== undefined && v !== '' ? ': ' + v : ''), true);
  };

  send(location.pathname, false);
})();
