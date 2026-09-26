# Higio lokalni podatkovni model

Status: lokalni model do Faze 7 dovršen
Primarna vremenska zona: `Europe/Zagreb`

## Odluke

- SQLite je jedini izvor istine lokalnog MVP-a.
- Drizzle definira tipiziranu shemu i verzionirane SQL migracije.
- Svi identifikatori su UUID tekst kako bi se zapisi kasnije mogli
  sinkronizirati bez promjene identiteta.
- Brisanje poslovnih zapisa koristi `deletedAtUtc`; fizičko brisanje nije dio
  uobičajenog korisničkog toka.
- Promjena rasporeda stvara novu verziju umjesto prepisivanja stare.
- UI koristi `TodayStore` i `ActivityStore` sučelja i ne zna za SQL ni Drizzle.

## Tablice

### `activities`

Identitet, opis i izgled aktivnosti: naziv, kategorija, ikona, boja, redoslijed
i informacija je li aktivnost istaknuta. `status` je trenutačna projekcija
vrijednosti `active`, `paused` ili `archived` za brz prikaz.

### `activity_state_versions`

Povijest aktivnog, pauziranog i arhiviranog stanja po lokalnom datumu. Promjena
statusa ne briše aktivnost ni logove. Tablica omogućuje da buduća statistika
iz nazivnika izostavi stvarno pauzirane dane bez retroaktivnog nagađanja.

### `schedule_versions`

Nepromjenjiva verzija rasporeda aktivnosti. Sadrži tip rasporeda, razdoblje
valjanosti, zonu i podatke intervala. `validFromLocalDate` i
`validToLocalDate` osiguravaju da kasnija promjena ne prepravi povijest.

Podržana su četiri tipa:

- `daily_slots` za jedan ili više dnevnih termina
- `weekdays` za odabrane ISO dane tjedna
- `interval` za svakih N dana ili tjedana
- `unscheduled` za ponovljiva izvršenja bez planiranog termina

Interval sprema `intervalEvery`, `intervalUnit` i `firstDueLocalDate`.
Nakon prvog izvršenja sljedeći termin računa se od lokalnog datuma zadnjeg
stvarnog izvršenja. Ako korisnik kasni, ne stvaraju se duplikati: jedan
planirani termin ostaje otvoren sve dok se ne evidentira.

### `schedule_slots`

Jedan imenovani termin unutar verzije rasporeda, primjerice jutro ili večer.
Slot sadrži dio dana, opcionalno preferirano vrijeme i redoslijed prikaza.

### `schedule_weekdays`

Odabrani ISO dani tjedna (`1` ponedjeljak, `7` nedjelja) za tjedni raspored.

### `activity_logs`

Jedno stvarno izvršenje. Sprema:

- apsolutni trenutak `occurredAtUtc`
- nepromjenjivi `localDate` i `localTime`
- IANA zonu `Europe/Zagreb`
- UTC pomak koji je vrijedio u trenutku izvršenja
- vezu s planiranim terminom kada ona postoji

`occurrenceKey` jednoznačno identificira planirani termin:

```text
scheduleVersionId:slotId:plannedLocalDate
```

Jedinstveni indeks sprječava dvostruko evidentiranje istog termina. Poništeni
zapis ostaje tombstone; novo evidentiranje istog termina ponovno aktivira
postojeći zapis i time ostaje idempotentno.

Aktivnost bez rasporeda nema `occurrenceKey` ni `plannedLocalDate`. Svaki dodir
stvara zaseban log, pa je dopušteno više stvarnih izvršenja istoga dana.

### `settings`

Jednostavne lokalne postavke i markeri inicijalizacije u JSON tekstu.

Faza 7 ovdje sprema dvije verzionirane vrijednosti:

- `reminders.preferences.v1` — uključeno stanje, vremena grupa, privatni tekst
  i horizont planiranja
- `reminders.scheduled-records.v1` — stabilni ključ, fingerprint, UTC vrijeme i
  ID obavijesti koji je vratio operacijski sustav

Evidencija ID-jeva nije izvor rasporeda. Željeni podsjetnici uvijek se ponovno
izračunavaju iz aktivnosti, verzija rasporeda i logova, a spremljeni ID-jevi
služe samo za zadržavanje, otkazivanje i uklanjanje duplikata u Androidu/iOS-u.

## Zagrebačko vrijeme

Dok korisnik ne zatraži drukčije, Higio koristi jednu kućnu zonu:
`Europe/Zagreb`.

- današnji datum, rasporedi i prikaz vremena računaju se u toj IANA zoni
- UTC pomak nije fiksan; proizlazi iz zone i trenutka, pa DST radi automatski
- stari log zadržava svoj lokalni datum, vrijeme, zonu i tadašnji pomak
- promjena zone uređaja ili putovanje ne premješta stare zapise

Ovo je namjerna produktna odluka za početni lokalni MVP i može se kasnije
proširiti postavkom kućne zone.

## Pravila uređivanja u prvoj alphi

- naziv, opis, kategorija, ikona i boja mijenjaju se odmah
- izmijenjeni raspored stvara novu verziju koja vrijedi od sutra
- ako je buduća verzija već spremljena isti dan, uređuje se ta verzija bez
  stvaranja preklapajućih rasporeda
- pauziranje ili arhiviranje vrijedi od današnje lokalne zagrebačke date
- već evidentirani današnji termin ostaje vidljiv nakon pauziranja
- nedovršeni termin pauzirane ili arhivirane aktivnosti nestaje s ekrana Danas

## Trenutačna granica

Lokalna alpha podržava aktivnosti, sva četiri rasporeda, one-tap log, povijest,
ispravke i grupirane lokalne podsjetnike. Statistički ekran još nema stvarne
agregate; oni pripadaju Fazi 8.

Backend, račun i cloud sinkronizacija i dalje su namjerno odgođeni.

## Doza — 10. rujna 2026.

Migracija 0002 dodaje nullable tekst `dose_label` verziji rasporeda i logu.
Oznaka pripada terminu (npr. `3 tablete`), ne broju logova. Promjena doze
stvara novu verziju rasporeda po postojećem pravilu od sutra. Stari log se
ne mijenja; naknadni unos uzima dozu verzije važeće na odabrani datum.
Format backupa 2 / schema 3 zadržava te vrijednosti, a stari format 1 dobiva
null doze pri eksplicitnoj pretvorbi.
