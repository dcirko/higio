# Higio — Netlify web objava

## Plan

- [x] Provjeriti postojeći web preview i upute Expo SDK-a 57.
- [x] Dodati Netlify build konfiguraciju i SPA fallback.
- [x] Izgraditi produkcijski web bundle i lokalno provjeriti onboarding, unos i trajnost.
- [x] Commitati i pushati konfiguraciju u `dcirko/higio` (`6b838a2`).
- [x] Objaviti web aplikaciju na Netlify računu `dcirko` izravnim uploadom.
- [x] Provjeriti javnu adresu, HTTP odgovore ruta i javni unos aktivnosti.
- [x] Dodati potvrđenu javnu poveznicu u README.
- [x] Potvrditi sačuvan zapis nakon ponovnog učitavanja javne aplikacije.
- [ ] Opcionalno povezati GitHub za automatske buduće objave.

## Rezultat objave i provjere

- Javna adresa: https://higio-dcirko.netlify.app/
- Netlify projekt: `higio-dcirko`, ID `67971b1d-8c1f-4c9f-b92b-1887599c7209`.
- Objavljeno 29. 9. 2026. preko Netlify Dropa; deploy ID `6abbc8f425701e62782e48b4`.
- Produkcijski build, TypeScript i Prettier provjera izmijenjenog TSX-a i package.json prolaze.
- Lokalno provjereni onboarding, unos i očuvanje unosa nakon osvježavanja.
- Na javnoj adresi provjereni onboarding i unos: napredak prelazi s 0/3 na 1/3.
- HTTPS rute `/`, `/dog` i `/history` vraćaju 200 i Higio HTML.
- JavaScript bundle 30. 9. vraća 200, ispravan MIME tip i 2.814.328 bajtova.
- Ugrađeni preglednik tijekom provjere imao je sporo učitavanje i timeoute,
  bez zabilježene JavaScript greške. Nakon učitavanja 30. 9. prikazana je aplikacija
  i sačuvan zapis od 29. 9. u 19:26. Zapis je potvrđen na kartici i u Povijesti.
  Nije bila potrebna promjena koda. Chrome nije bio dostupan alatu.
- Snimka provjere: lokalni `apps/mobile/artifacts/netlify-live-history.png`.
- GitHub import u Netlify sučelju nije nastavio nakon klika; automatska objava
  nije uključena. Ne kreirati drugi projekt radi povezivanja repozitorija.

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
