# Higio lokalna sigurnosna kopija

Datum ugovora: 10. rujna 2026.

## Svrha

Higio izvoz je prijenosna JSON sigurnosna kopija lokalne SQLite baze. Korisnik
je sam sprema kroz Android/iOS sistemski izbornik i može je kasnije vratiti bez
računa, interneta ili Higio backenda.

Trenutačni ugovor:

- `format`: `higio.local-backup`
- `formatVersion`: `2`
- `databaseSchemaVersion`: `3`
- najveća prihvaćena datoteka: 5 MB
- ekstenzija: `.json`
- primjer naziva: `higio-backup-2026-08-06T10-00-00Z.json`

`formatVersion` opisuje vanjski JSON ugovor. `databaseSchemaVersion` opisuje
lokalnu bazu iz koje je izvoz nastao. Promjena jednog broja ne mora nužno
promijeniti drugi.

## Struktura

```json
{
  "format": "higio.local-backup",
  "formatVersion": 2,
  "databaseSchemaVersion": 3,
  "exportedAtUtc": "2026-08-06T10:00:00.000Z",
  "source": {
    "appVersion": "0.1.0",
    "platform": "android",
    "timezone": "Europe/Zagreb"
  },
  "tables": {
    "activities": [],
    "activity_state_versions": [],
    "schedule_versions": [],
    "schedule_slots": [],
    "schedule_weekdays": [],
    "activity_logs": [],
    "settings": []
  }
}
```

Redovi tablica koriste stvarne SQLite nazive stupaca. UTC timestampovi u
redovima su cijeli brojevi u milisekundama od Unix epohe. Lokalni datumi koriste
`YYYY-MM-DD`, lokalno vrijeme `HH:mm`, a izvršenja dodatno čuvaju IANA zonu i
UTC pomak. Time stari zapis ostaje na izvornom zagrebačkom kalendarskom danu.

## Što ulazi u kopiju

- aktivnosti, uključujući pauzirane i arhivirane
- povijesne verzije statusa i rasporeda
- dnevni slotovi i odabrani dani
- sva izvršenja, uključujući soft-delete podatke potrebne za točnu povijest
- onboarding i korisničke postavke spremljene u SQLiteu
- postavke lokalnih podsjetnika

## Što se namjerno ne izvozi

- identifikatori već zakazanih sistemskih obavijesti
- postavka biometrijskog zaključavanja
- postavka zaštite prikaza
- privremene cache datoteke
- razvojne postavke, ključevi ili tokeni

Identifikatori obavijesti pripadaju konkretnom uređaju. Pri povratu Higio čuva
trenutačni uređajski popis dovoljno dugo da može ukloniti stare alarme, a zatim
ih ponovno usklađuje s vraćenim rasporedom. Sigurnosne postavke ostaju u Secure
Storeu trenutačnog uređaja i nikada se ne uključuju iz kopije drugog uređaja.

## Validacija prije povrata

Prije ikakve promjene baze provjerava se:

1. JSON sintaksa, veličina, format i podržana verzija
2. dopušteni stupci i tipovi svih redova
3. jedinstveni primarni i složeni ključevi
4. veze aktivnosti, rasporeda, slotova i izvršenja
5. zabrana uređajskih postavki u uvezenoj datoteci

Tek nakon uspješne provjere korisnik vidi sažetak s datumom izvoza, brojem
aktivnosti i brojem zapisa. Povrat zahtijeva eksplicitnu potvrdu da će
trenutačni lokalni podatci biti zamijenjeni.

Zamjena se izvršava u jednoj ekskluzivnoj SQLite transakciji. Nakon umetanja
pokreće se `foreign_key_check`. Svaka greška vraća cijelu transakciju, pa nema
djelomično vraćene baze.

## Doze i prijelaz s formata 1

Format 2 uključuje kategoriju `supplements` te obvezan nullable stupac
`dose_label` u `schedule_versions` i `activity_logs` (najviše 80 znakova).
Verzija rasporeda čuva konfiguraciju doze, a log snimku uzetog unosa.
SQLite migracija 0002 dodaje oba stupca bez brisanja redova.

Uvoz prihvaća strogi stari format 1 / schema 2 i eksplicitno ga pretvara u
format 2 / schema 3. Starim rasporedima i zapisima dodaje `dose_label: null`.
Ne izvodi povijesnu dozu iz naziva ili trenutačne konfiguracije. Izvoz uvijek
koristi format 2; starija aplikacija ga neće moći uvesti.

## Pravila kompatibilnosti

- aplikacija odbija nepoznati `formatVersion` umjesto nagađanja
- buduća verzija koja može čitati format 1 mora imati eksplicitno testiranu
  pretvorbu u aktualnu bazu
- objavljena verzija formata više se ne mijenja u mjestu
- primjer sigurnosne kopije ne smije sadržavati stvarne korisničke podatke
- export/parse round trip i nevaljane veze pokrivaju automatski testovi

## Privatnost

Izvoz nije šifriran jer mora ostati jednostavno prenosiv i obnovljiv bez računa.
Datoteka zato može sadržavati privatne nazive i povijest. Higio je predaje samo
sistemskom izborniku za spremanje/dijeljenje; korisnik odlučuje kamo će je
spremiti. UI jasno upozorava da sigurnosnu kopiju treba čuvati na privatnom
mjestu.
