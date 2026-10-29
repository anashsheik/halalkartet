/* Besøkstelling med Plausible (plausible.io, servere i EU).
   Ingen cookies, ingenting lagres i nettleseren, og Plausible lagrer ikke IP-adressen.
   Selve skriptet hentes fra plausible.io i index.html. Denne filen gjør klart køen, så hendelser
   som sendes før skriptet er lastet, ikke går tapt. Den står her og ikke inne i index.html fordi
   CSP-en ikke tillater skript skrevet rett i siden.
   Plausible teller bare halalkartet.no, ikke localhost eller testene. */
window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments); };
plausible.init = plausible.init || function (i) { plausible.o = i || {}; };
plausible.init();
