# Higio

Higio je lokalno-prva mobilna aplikacija za brzo praćenje osobne higijene,
njege, ponavljajućih rutina i dnevnog unosa suplemenata.

Glavna vrijednost proizvoda:

> Otvori aplikaciju, jednim dodirom evidentiraj obavljenu aktivnost i odmah
> nastavi s danom.

## Trenutačno stanje

Higio je Android-first aplikacija s podrškom u kodu za iOS i pomoćnim web
previewjem. Implementirani su dnevne aktivnosti i rutine, suplementi,
povijest i statistika, podsjetnici za neodrađene aktivnosti, povremena njega
s datumom zadnjeg unosa te zasebna sekcija za psa. Widgeti su odgođeni.

Posljednji lokalni Android preview APK izgrađen je 21. 9. 2026. Provjere
te verzije obuhvatile su 69 testova u 16 skupina, TypeScript, ESLint i
Prettier. To nije potvrda fizičke provjere svih najnovijih funkcija.
APK, baze, osobni zapisi i lokalni buildovi nisu dio ovog repozitorija.

## Pokretanje web previewja

```sh
cd apps/mobile
npm ci
npm run web
```

Preview omogućuje isprobavanje praćenja aktivnosti u pregledniku bez
instaliranja APK-a. Podaci se spremaju u `localStorage` tog preglednika;
ne sinkroniziraju se s mobitelom i mogu se izgubiti brisanjem podataka
preglednika. Web preview nema lokalne obavijesti, biometrijsku zaštitu,
zaštitu snimanja zaslona ni izvoz/povrat sigurnosne kopije.

Za izgradnju web verzije:

```sh
npm run build:web
```

Izlaz je u `apps/mobile/dist`. Javni web demo još nije objavljen.
Repozitorij sadrži `netlify.toml` s build postavkama i SPA fallbackom.
Za objavu povezati `dcirko/higio` u Netlifyju s granom `main`.
[Plan objave i provjere](docs/NETLIFY_DEPLOYMENT.md).

## Dosadašnje faze i provjere

- Dodani su Suplementi: četiri dnevna predloška, prikaz i verzioniranje doze,
  one-tap unos, povijest i backup format 2 s uvozom formata 1.
- Android je primaran; iOS/TestFlight ne blokira lokalni Android MVP.
- 13. 9. 2026. izgrađen je privatni alpha APK s ugrađenim bundleom. Offline
  onboarding, unos, povijest, statistika i trajnost nakon ponovnog otvaranja
  potvrđeni su na Android API 36 emulatoru. Fizički mobitel još nije provjeren.
- 14. 9. dovršen je offline restore test na emulatoru: vraćen je uklonjeni
  zapis, sačuvane stare doze i potvrđena nova doza sljedećeg dana. Popravak
  obrasca s Android tipkovnicom potvrđen je u APK-u; prolaze 54 testa.
- [Plan i provjere Suplemenata](docs/SUPPLEMENTS_PLAN.md)
- [Završni izvještaj i iduće faze](docs/SUPPLEMENTS_REPORT.md)
- [Fizička Android provjera i privatna alpha](docs/ANDROID_ALPHA_REPORT.md)
- [Nadogradnje nakon korištenja: podsjetnici, čitljivost i buduće faze](docs/POST_USE_PLAN.md)
- [Checklist za fizički Android](docs/ANDROID_DEVICE_CHECKLIST.md)

- Faza 0 produktnog ugovora je završena.
- Mobilni kostur koristi Expo SDK 57, React Native 0.86 i TypeScript.
- UX kostur Faze 2 ima design tokene, četiri donje kartice i one-tap prototip.
- Faza 3 ima SQLite + Drizzle shemu, prvu migraciju, početne aktivnosti i čistu
  domensku jezgru rasporeda.
- Ekran Danas sprema izvršenje jednim dodirom, prikazuje full-screen potvrdu,
  podržava undo i koristi zonu `Europe/Zagreb`.
- Faza 4 donosi kreiranje i uređivanje aktivnosti, izbor kategorije, ikone i
  boje te pauziranje i arhiviranje bez
  brisanja povijesti.
- Faza 5 dovršava sva četiri rasporeda: dnevne slotove, odabrane dane,
  interval svakih N dana/tjedana i aktivnosti bez rasporeda.
- Faza 6 donosi stvarnu SQLite povijest, filtre, ručni unos propuštenog
  izvršenja, promjenu vremena zapisa te sigurno uklanjanje s kratkim
  poništavanjem.
- Faza 7 donosi opcionalne i grupirane lokalne podsjetnike, dozvolu tek pri
  uključivanju, privatni zadani tekst, automatsko ponovno planiranje i deep link
  na ekran Danas.
- Faza 8 zamjenjuje statički primjer stvarnom 7/30-dnevnom statistikom:
  planirano/obavljeno, dnevni trend, zadnje izvršenje, prosječni razmak i pregled
  po aktivnosti. Intervalni termin broji se samo jednom, a aktivnosti bez
  rasporeda nemaju umjetni postotak.
- Faza 9 donosi onboarding bez obvezne registracije, izbor početnih predložaka
  ili prazan početak, biblioteku predložaka, jutarnju i večernju rutinu,
  evidentiranje cijele rutine te promjenu redoslijeda aktivnosti.
- Implementacijski dio Faze 10 donosi verzionirani lokalni JSON export/restore,
  validaciju i atomski povrat SQLite podataka, opcionalno biometrijsko
  zaključavanje, zaštitu privatnog prikaza, Secure Store postavke, privacy audit,
  sanitizirane tehničke logove i Maestro smoke tokove.
- Faza 10 još nije konačno zatvorena: slijede fizički Android export/restore i
  biometrijski test te najmanje dva tjedna stvarne uporabe na Androidu.
- Ručni unos može se povezati s konkretnim planiranim terminom, pa naknadno
  evidentiranje ispravlja upravo taj jutarnji, večernji ili intervalni termin.
- Interval se računa od zadnjeg stvarnog izvršenja, zakašnjeli termin ostaje
  jedna otvorena stavka, a promjena rasporeda stvara novu verziju od sutra.
- Brze aktivnosti mogu se evidentirati više puta dnevno i ne ulaze u dnevni
  postotak. Popis aktivnosti prikazuje sljedeći očekivani termin.
- Android SDK API 36 i Pixel 7 emulator `Higio_API_36` postavljeni su za
  lokalnu native provjeru.
- Android/iOS koriste trajnu SQLite bazu. Pomoćni web preview koristi
  `localStorage` iza istog repository sučelja jer je Expo SQLite podrška za web
  još alfa.
- Backend, registracija i cloud sinkronizacija namjerno su odgođeni.

## Dokumentacija

- [Master-plan](docs/MASTER_PLAN.md)
- [Specifikacija proizvoda](docs/PRODUCT_SPEC.md)
- [UX kostur Faze 2](docs/UX_SPEC.md)
- [Lokalni podatkovni model](docs/DATA_MODEL.md)
- [Android razvojno okruženje](docs/ANDROID_SETUP.md)
- [Izvještaj prve interne alphe](docs/PHASE_4_REPORT.md)
- [Izvještaj dovršenog scheduling enginea](docs/PHASE_5_REPORT.md)
- [Izvještaj povijesti i ispravaka](docs/PHASE_6_REPORT.md)
- [Izvještaj lokalnih podsjetnika](docs/PHASE_7_REPORT.md)
- [Izvještaj statistike, onboardinga i rutina](docs/PHASE_8_9_REPORT.md)
- [Format lokalne sigurnosne kopije](docs/BACKUP_FORMAT.md)
- [Audit privatnosti i sigurnosti](docs/PRIVACY_SECURITY_AUDIT.md)
- [Izvještaj implementacijskog dijela Faze 10](docs/PHASE_10_REPORT.md)

## Mobilna aplikacija

Projekt se nalazi u `apps/mobile`.

Preduvjeti:

- Node.js 22.13 ili noviji kompatibilan sa SDK-om 57
- npm
- Android SDK 36, platform-tools, emulator i JDK 21 za lokalni Android build
- EAS račun tek kada bude potreban cloud build

Osnovne naredbe:

```powershell
cd apps\mobile
npm install
npm run lint
npm run typecheck
npm test
npm run db:generate
npm start
npm run android
```

`npm run db:generate` pokreće se samo nakon namjerne promjene
`src/data/db/schema.ts`; generirane migracije ulaze u Git.

Za postojeći emulator:

```powershell
emulator -avd Higio_API_36
adb devices
cd C:\Users\domag\source\repos\Higio\apps\mobile
npm run android
```

Uspješan build potvrđuje kompilaciju. SQLite trajnost, modal, haptiku,
obavijesti i sigurnosne tokove treba zasebno provjeriti na fizičkom Androidu.
