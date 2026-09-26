# Faze 8 i 9 — statistika, onboarding, predlošci i rutine

Datum završetka: 5. kolovoza 2026.

## Ishod

Higio sada iz lokalne SQLite povijesti računa objašnjivu statistiku za
posljednjih 7 ili 30 dana. Novi korisnik može u manje od minute odabrati
prilagodljive početne predloške ili krenuti s potpuno praznom aplikacijom.
Jutarnji i večernji termini čine rutine koje se mogu poredati i evidentirati
jednom akcijom.

Postojeće alpha instalacije zadržavaju svoje aktivnosti i povijest. Novi
onboarding ne briše, ne prepisuje i ne duplicira njihove podatke.

## Faza 8 — isporučeno

- stvarni omjer obavljenih i planiranih termina za 7 i 30 dana
- dnevni trend s tekstualnim opisom svakog stupca za čitače zaslona
- ukupno planirano i obavljeno s jasno prikazanim nazivnikom
- zadnje evidentiranje i prosječni kalendarski razmak između izvršenja
- statistika po aktivnosti
- aktivnosti bez rasporeda prikazuju broj evidencija, ali nemaju besmislen
  postotak uspješnosti
- povijesni status aktivnosti određuje se iz `activity_state_versions`, pa
  današnje pauziranje ne uklanja stare legitimne planirane termine
- povijesne verzije rasporeda ostaju izvor istine za stara razdoblja
- overdue intervalni termin broji se jednom na izvornom planiranom datumu,
  iako se na ekranu Danas može prikazivati više dana dok čeka izvršenje
- izvršenje evidentirano nakon završetka odabranog razdoblja ne popravlja
  retroaktivno stari rezultat

## Faza 9 — isporučeno

- onboarding s lokalnim objašnjenjem privatnosti i rada bez registracije
- početak s odabranim predlošcima ili potpuno praznom aplikacijom
- predlošci za oralnu njegu, tijelo, kosu, kožu i osobne stvari
- biblioteka predložaka dostupna kasnije kroz `Više → Predlošci`
- zaštita od dupliciranja aktivnosti istog naziva pri ponovnom dodavanju
- jasna napomena da su predlošci organizacijska polazišta, a ne medicinske
  preporuke
- jutarnja i večernja rutina izvedene su iz postojećih slotova; nema nove
  paralelne tablice ni duplicirane pripadnosti
- gumb `Dovrši rutinu` na ekranu Danas sprema samo još nedovršene korake
- grupno evidentiranje ima jednu full-screen potvrdu i zajednički undo
- djelomično grupno spremanje vraća već spremljene zapise ako kasniji korak ne
  uspije
- ekran `Više → Rutine` omogućuje pristupačnu promjenu redoslijeda tipkama
  gore/dolje

## Onboarding i postojeći korisnici

Automatsko seedanje novih instalacija uklonjeno je iz startup toka. Potpuno nova
baza zato prvo otvara onboarding. Korisnik sam odlučuje koje će predloške dodati
ili bira prazan početak.

Ako baza već sadrži stari `starter_seed_v2` marker ili postojeće aktivnosti,
jednokratna kompatibilnost označava onboarding dovršenim. Time se postojeći
korisnik ne vraća na početni ekran i ne dobiva duplikate.

Web preview koristi isti produktni tok uz `localStorage`. Native Android/iOS
aplikacija i dalje koristi SQLite kao glavni izvor podataka.

## Arhitektonske odluke

Statistika je čista domena u `domain/insights.ts`; UI ne sadrži SQL niti pravila
denominatora. Ekran učitava dnevne planirane termine, aktivnosti i povijesne
logove preko postojećih store sučelja, a zatim domenski agregator stvara prikaz.

Rutine su za lokalni MVP izvedeni pogled nad `dayPart` slotovima. To je
jednostavnije i sigurnije od uvođenja novog modela članstva prije nego stvarna
uporaba pokaže potrebu za proizvoljnim korisničkim rutinama.

Onboarding stanje sprema se u postojeću SQLite tablicu `settings`, pa za ovu
fazu nije bila potrebna nova migracija baze.

## Provjera

- TypeScript strict: prolazi
- ESLint: prolazi bez upozorenja
- Jest: 10 paketa, 39 testova, svi prolaze
- novi testovi pokrivaju denominator intervalne aktivnosti, kasno izvršenje,
  aktivnosti bez rasporeda, intervalne predloške, redoslijed i grupno
  evidentiranje rutine
- Android development build: uspješno izgrađen i instaliran
- Android API 36 emulator `Higio_API_36`: Metro Android bundle uspješno učitan
- postojeća SQLite alpha baza: otvorena bez gubitka podataka i bez ponovnog
  onboardinga
- native ekran Danas: stvarno prikazuje `Dovrši rutinu`
- native ekran Statistika: stvarno prikazuje lokalni 7-dnevni rezultat, trend i
  podatke po vremenu `Europe/Zagreb`
- native ekran Rutine: stvarno prikazuje jutarnje/večernje članove i kontrole
  redoslijeda
- Android log: nema React Native ni `AndroidRuntime` greške nakon uspješnog
  učitavanja

### Ovisnosti i sigurnosna provjera

- javna Expo konfiguracija potvrđuje SDK 57, React Native 0.86.2 i development
  paket `com.domag.higio.dev`
- `expo install --check`: sve Expo ovisnosti su kompatibilne i ažurne
- siguran `npm audit fix` bez opcije `--force` uklonio je high ranjivost u
  tranzitivnom paketu `brace-expansion`
- završni `npm audit --audit-level=high` prolazi bez high ili critical nalaza
- ostaje 15 moderate nalaza u Drizzle/Expo razvojnim i build alatima; ponuđeni
  automatski popravak zahtijeva nekompatibilan downgrade, pa se prati do
  kompatibilnog upstream ažuriranja umjesto primjene `--force`

Android alatni lanac ispisuje deprecation upozorenja iz Expo/Gradle ovisnosti.
Build ipak prolazi; upozorenja nisu runtime greška Higija, ali treba ih ponovno
provjeriti pri sljedećem usklađivanju Expo SDK-a prije bete.

Testiranje potpuno svježe native baze namjerno nije brisalo postojeće korisničke
alpha podatke. Prazni onboarding tok pokriven je implementacijom i testovima, a
potpuno destruktivni clean-install scenarij treba ponoviti na zasebnoj preview
varijanti u Fazi 10.

## Sljedeće

Faza 10 uvodi sigurnost podataka i privatnu betu: verzionirani izvoz i povrat,
opcionalnu biometriju i privacy screen, audit dozvola, crash reporting bez
privatnog sadržaja, E2E provjere, performance profiliranje te interne Android i
iOS buildove za najmanje dva tjedna stvarne uporabe.
