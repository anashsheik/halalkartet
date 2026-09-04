/* Google Analytics 4.
   Ligger i egen fil, ikke som <script> inne i index.html, fordi CSP-en vår
   ikke tillater 'unsafe-inline'. En innebygd blokk blir avvist av nettleseren
   for den i det hele tatt kjorer. Denne filen serveres fra 'self' og slipper
   gjennom uten a apne policyen for all inline-kode.

   Uten informasjonskapsler:
   client_storage: 'none' ber gtag droppe _ga-cookiene. Da holder loftet i
   personvernteksten var - "ingen sporingscookies" - og vi trenger ikke
   samtykkebanner. Prisen er at gjengangere telles som nye besok.
   Vil du ha full GA4 med cookies, fjern linjen. Da ma du samtidig legge til
   et samtykkebanner og skrive om personvernteksten. */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-8NT96KQTVS', {
  client_storage: 'none',
  anonymize_ip: true
});
