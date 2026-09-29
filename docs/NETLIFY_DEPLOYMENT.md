# Higio — Netlify web objava

## Plan

- [x] Provjeriti postojeći web preview i upute Expo SDK-a 57.
- [x] Dodati Netlify build konfiguraciju i SPA fallback.
- [ ] Izgraditi produkcijski web bundle i provjeriti glavne tokove u pregledniku.
- [ ] Commitati i pushati konfiguraciju u `dcirko/higio`.
- [ ] Povezati Netlify projekt i objaviti web aplikaciju.
- [ ] Provjeriti javnu adresu, izravne rute i trajnost podataka nakon osvježavanja.
- [ ] Dodati potvrđenu javnu poveznicu u README.

## Konfiguracija

`netlify.toml` u korijenu repozitorija definira:

- base: `apps/mobile`
- naredba: `npm run build:web`
- publish: `dist` u odnosu na base
- Node.js 22 i `APP_VARIANT=production`

`apps/mobile/public/_redirects` kopira se u build i vraća `index.html`
za SPA rute. Postojeće statičke datoteke poslužuju se normalno.

## Povezivanje računa

U Netlifyju odabrati import postojećeg GitHub projekta `dcirko/higio`,
granu `main` i provjeriti da su učitane postavke iz `netlify.toml`.
Nije potrebno dodavati tajne ni backend. Za novi pristup GitHubu odabrati
samo ovaj repozitorij kad Netlify ponudi izbor.

## Granice web verzije

Podaci ostaju u pregledniku (`localStorage`), odvojeni od mobitela i drugih
preglednika. Brisanje podataka preglednika briše lokalnu evidenciju.
Lokalne obavijesti, biometrija, zaštita snimanja zaslona i JSON backup/restore
nisu dostupni na webu. Nema računa ni sinkronizacije. Mobilni APK nije
dio web objave.
