# Higio — audit privatnosti i sigurnosti lokalne bete

Datum provjere: 6. kolovoza 2026.

## Sažetak

Lokalni MVP nema korisnički račun, backend, analitiku, oglase ni automatsko
slanje podataka. SQLite na uređaju ostaje jedini izvor podataka. Phase 10 dodaje
ručni izvoz/povrat, opcionalnu biometrijsku zaštitu i skrivanje privatnog
sadržaja na razini platforme.

## Podatci i mjesta pohrane

| Podatak | Pohrana | Napomena |
|---|---|---|
| aktivnosti, rasporedi i povijest | SQLite | lokalni primarni izvor |
| onboarding i podsjetnici | SQLite `settings` | bez sadržaja u cloudu |
| biometrija i privacy postavke | Expo Secure Store | mala uređajska postavka |
| zakazane obavijesti | Android/iOS scheduler | identifikatori se ne izvoze |
| privremeni JSON izvoz | cache | briše se nakon zatvaranja share dijaloga |

Higio ne sprema biometrijski predložak. Provjeru identiteta obavlja operacijski
sustav, a aplikacija dobiva samo uspjeh ili neuspjeh.

## Dozvole

Namjerno potrebne native mogućnosti:

- `POST_NOTIFICATIONS` tek kada korisnik uključi podsjetnike
- `SCHEDULE_EXACT_ALARM` za precizne lokalne podsjetnike na Androidu
- `VIBRATE` za haptiku i obavijesti
- platformna biometrija za opcionalno zaključavanje
- sistemski Document Picker i Share Sheet bez izravnog pristupa galeriji

Namjerno blokirane Android dozvole:

- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`
- `SYSTEM_ALERT_WINDOW`

Higio ne traži lokaciju, kontakte, kameru, mikrofon, fotografije ni popis
datoteka. Document Picker korisniku daje izričit izbor jedne JSON datoteke.

React Native/Expo produkcijski manifest zadržava `INTERNET`. Lokalni MVP ne
izvršava Higio API pozive, ali razvojni client i budući kontrolirani EAS/update
tokovi ovise o mrežnom sloju. Uvođenje bilo kakve produkcijske mrežne razmjene
zahtijeva novu odluku, privacy policy i dokumentirani popis odredišta.

Android automatski backup aplikacije isključen je (`allowBackup: false`) kako
nekontrolirana djelomična kopija SQLite/Secure Store podataka ne bi zamijenila
dokumentirani Higio export/restore tok.

## Zaštita prikaza i zaključavanje

- zaštita privatnog prikaza uključena je zadano
- Android koristi `FLAG_SECURE`: blokira snimke/recording i prikazuje prazan
  recent-apps preview
- iOS koristi blokiranje snimanja i zamućen app-switcher preview
- korisnik zaštitu može isključiti u `Više → Podatci i privatnost`
- zaključavanje aplikacije biometrijom je opcionalno i zadano isključeno
- uključivanje zaključavanja prvo zahtijeva uspješnu platformsku autentifikaciju
- nakon odlaska aplikacije u pozadinu sadržaj se zaključava prije povratka
- šifra uređaja ostaje platformski fallback; Higio nema vlastitu PIN bazu

## Logovi i greške

Privacy-safe logger prima samo stabilan tehnički naziv događaja, trajanje,
platformske tehničke oznake i naziv klase greške. Ne zapisuje `error.message`,
nazive aktivnosti, bilješke, datume izvršenja ni sadržaj backupa.

U development buildu tehnički događaji ostaju lokalni u konzoli. Vanjski crash
reporting nije uključen u lokalnu betu jer još nije odabran provider ni
pribavljena korisnička suglasnost. Prije uvođenja mora imati:

- eksplicitni allowlist polja
- isključene screenshotove, breadcrumbs teksta i session replay
- EU/EEA odluku o obradi i rok čuvanja
- test koji potvrđuje da privatni sadržaj ne napušta uređaj

Root error boundary korisniku prikazuje neutralnu poruku i ne briše SQLite.

## Backup prijetnje i zaštite

- datoteka je ograničena na 5 MB prije parsiranja
- Zod schema odbija višak i nedostatak polja
- referencijalna pravila provjeravaju se prije transakcije
- postojeći podatci mijenjaju se samo nakon pregleda i eksplicitne potvrde
- povrat je jedna SQLite transakcija s `foreign_key_check`
- JSON nije šifriran; korisnik se zato upozorava da ga čuva privatno
- nema automatskog slanja ili uploada kopije

## Preostale provjere prije zatvaranja Faze 10

- fizički Android uređaj: haptika, biometrija, background lock i share/picker
- iOS TestFlight: Face ID/Touch ID, privacy blur, export i restore
- Maestro tokovi na instaliranoj preview varijanti
- hladni i topli startup na barem jednom slabijem fizičkom uređaju
- najmanje dva tjedna stvarne uporabe bez gubitka ili dupliciranja podataka
- ponovni dependency audit prije svakog internog builda

Backend, račun i sinkronizacija nisu dio ovog audita niti lokalne bete.
