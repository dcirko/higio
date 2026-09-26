# Faza 10 — sigurnost podataka, izvoz i priprema privatne bete

Datum implementacijskog reza: 6. kolovoza 2026.

## Naknadna odluka — 10. rujna 2026.

Izvještaj u nastavku je povijesni zapis. Android je sada obvezna platforma;
iOS/TestFlight više nije uvjet zatvaranja lokalne Android bete. Suplementi
uvode backup format 2 / schema 3 uz uvoz starog formata. Aktualne provjere
nalaze se u [planu Suplemenata](SUPPLEMENTS_PLAN.md).

## Ishod

Higio sada ima lokalni, ručno prenosiv backup bez registracije i backenda.
Korisnik može izvesti sve bitne SQLite podatke, pregledati odabranu kopiju i tek
nakon jasne potvrde atomski zamijeniti lokalnu bazu. Dodani su opcionalno
biometrijsko zaključavanje, zadana zaštita privatnog prikaza i uređajske
sigurnosne postavke u Secure Storeu.

Ovo završava implementacijski dio Faze 10, ali ne i samu privatnu betu. iOS
TestFlight, fizička biometrija/export provjera i najmanje dva tjedna stvarne
uporabe ne mogu se vjerodostojno označiti završenima u jednom razvojnom rezu.

## Backup i povrat

- format `higio.local-backup`, verzija 1, database schema verzija 2
- JSON limit 5 MB prije parsiranja
- uključene aktivnosti, verzije stanja i rasporeda, slotovi, dani, logovi i
  prenosive SQLite postavke
- isključeni uređajski identifikatori obavijesti i Secure Store postavke
- stroga Zod schema bez nepoznatih polja
- provjera duplikata, referencijalnih veza i zabranjenih uređajskih ključeva
- pregled broja aktivnosti/logova i datuma izvoza prije povrata
- eksplicitna potvrda nepovratne zamjene
- jedna ekskluzivna SQLite transakcija i `foreign_key_check`
- postojeći uređajski identifikatori alarma privremeno se čuvaju kako bi
  coordinator mogao ukloniti stare i zakazati nove podsjetnike
- Document Picker čita samo datoteku koju korisnik odabere; Share Sheet određuje
  mjesto spremanja izvoza

Ugovor je opisan u `docs/BACKUP_FORMAT.md`.

## Privatnost i sigurnost

- ekran `Više → Podatci i privatnost`
- postavke za biometrijsko zaključavanje i privacy protection
- uključivanje app locka prvo zahtijeva uspješnu platformsku autentifikaciju
- sadržaj se zaključava pri odlasku aplikacije iz aktivnog stanja
- zaštita privatnog prikaza uključena je zadano i primjenjuje se prije prikaza
  baze pri pokretanju
- Android blokira snimanje/recording i recent-apps preview preko `FLAG_SECURE`
- iOS konfigurira Face ID opis te blur i zaštitu snimanja
- male uređajske postavke spremaju se u Secure Storeu, ne u SQLite backupu
- Android automatski backup isključen je u korist dokumentiranog ručnog toka
- storage i overlay dozvole eksplicitno su uklonjene iz merged manifesta
- root error boundary ne briše podatke i prikazuje neutralnu poruku

Audit je opisan u `docs/PRIVACY_SECURITY_AUDIT.md`.

## Observability i performance

Development logger bilježi samo stabilan naziv tehničkog događaja, trajanje i
naziv klase greške. Ne bilježi poruku iznimke, naziv aktivnosti, bilješku,
datum izvršenja ni JSON sadržaj.

Dodana su lokalna mjerenja za:

- pripremu SQLite baze pri pokretanju
- učitavanje ekrana Danas
- pripremu exporta
- atomski restore

Vanjski crash reporter nije uveden bez odabranog providera, pravila obrade i
eksplicitnog allowlista polja. To je privatniji i sigurniji izbor za lokalnu
betu od automatskog slanja razvojnih podataka.

## E2E kostur

Pripremljena su dva Maestro smoke toka za preview paket
`com.domag.higio.preview`:

1. čist onboarding → početni predlošci → Danas → one-tap → full-screen potvrda
   → undo
2. Više → Podatci i privatnost → prisutnost backup i security kontrola

Maestro CLI nije instaliran na računalu, pa tokovi nisu označeni izvršenima.
Sistemski share/picker/biometric dijalozi ostaju namjerna ručna native provjera.

## Ovisnosti

Aktualizirani su objavljeni Expo SDK 57 patch paketi:

- `expo` 57.0.11
- `expo-notifications` 57.0.9
- `expo-router` 57.0.11
- `expo-symbols` 57.0.2
- React Native ostaje 0.86.2

Expo compatibility metadata traži `expo-sharing` 57.0.10, ali npm registry za
tu verziju vraća `E404`. Zadržana je stvarno objavljena 57.0.9 umjesto previewa
ili izmišljene verzije.

`npm audit` prijavljuje 16 moderate nalaza u Expo/Drizzle razvojnim i build
ovisnostima, bez high ili critical nalaza. Automatski `--force` popravak traži
nekompatibilne downgradeove i nije primijenjen.

## Stvarna provjera

- TypeScript strict: prolazi
- ESLint: prolazi bez upozorenja
- Prettier cijelog projekta: prolazi
- Jest: 12 paketa, 47 testova, svi prolaze
- novi testovi: backup round trip, nepoznata verzija, prekinute veze, dupli
  termini, uređajski ključevi i sigurnosne preference
- Expo config: SDK 57, razvojni paket `com.domag.higio.dev`, biometrijski i
  Secure Store plugin te očekivane Android dozvole potvrđeni
- Expo Android prebuild: uspješan
- Android API 36 debug build: uspješan, izlaz 0
- APK: izgrađen i instaliran kao `com.domag.higio.dev` na emulator
- Android/Hermes export: 2.034 modula, bundle 5,2 MB, bez resolver/compile greške

### Granica native runtime provjere

Cold start development clienta uspio je, ali headless emulator pod velikim
Gradle opterećenjem prvo je prikazao sistemski `System UI isn't responding`.
Nakon toga Metro se na Windowsu vezao na IPv6 localhost, dok je Android
development client preko `adb reverse` tražio IPv4, pa je učitavanje završilo
s transportnim `unexpected end of stream` prije izvršavanja Higio JavaScripta.

Nema `AndroidRuntime`/FATAL pada Higio procesa, native moduli su uspješno
kompilirani i povezani, a isti JavaScript graph zasebno je uspješno izvezen.
Ipak, stvarni novi backup, Secure Store, biometric i Screen Capture tok u
otvorenom Android UI-ju nije potvrđen i ostaje beta gate. Development server
nije izložen LAN-u radi zaobilaženja problema.

## Što još zatvara Fazu 10

1. fizički Android: export → spremanje → odabir → restore, biometrija, app
   background lock, privacy preview, haptika i podsjetnici
2. instalirani Maestro CLI i izvršeni preview smoke tokovi
3. iOS EAS/TestFlight build uz Apple pristup
4. stvarni iPhone: Face ID/Touch ID, privacy blur, export/restore i podsjetnici
5. hladni startup na fizičkom, po mogućnosti slabijem uređaju
6. najmanje dva tjedna stvarne uporabe bez gubitka ili dupliciranja podataka

Tek nakon toga Faza 10 dobiva status `feature-complete lokalna beta`. Faza 11
(.NET backend, račun i cloud sinkronizacija) još ne počinje.
